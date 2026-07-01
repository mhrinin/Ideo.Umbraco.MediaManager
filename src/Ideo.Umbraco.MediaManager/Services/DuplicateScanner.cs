using System.Security.Cryptography;
using Ideo.Umbraco.MediaManager.Interfaces;
using Ideo.Umbraco.MediaManager.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Entities;
using Umbraco.Cms.Core.Services;

namespace Ideo.Umbraco.MediaManager.Services;

/// <summary>
/// Finds byte-identical media files. Files are grouped by size first — a cheap pre-filter, since only
/// equal-sized files can be identical — and the SHA-256 hash is computed only within those groups, so
/// most files are never read. Within each set of identical files the oldest node is kept and the rest
/// are reported as redundant copies.
/// </summary>
public sealed class DuplicateScanner(IEntityService entityService, MediaFileManager mediaFileManager) : IDuplicateScanner
{
    private const int PageSize = 500;

    public Task<IReadOnlyList<MediaCandidate>> ScanAsync(IProgress<int>? progress, CancellationToken cancellationToken)
    {
        var fileSystem = mediaFileManager.FileSystem;
        var files = new List<MediaFile>();
        long pageIndex = 0;
        long total;
        var processed = 0;

        do
        {
            cancellationToken.ThrowIfCancellationRequested();

            var page = entityService.GetPagedDescendants(
                UmbracoObjectTypes.Media,
                pageIndex,
                PageSize,
                out total,
                filter: null,
                ordering: null,
                includeTrashed: false);

            foreach (var entity in page)
            {
                if (entity is not IMediaEntitySlim media || string.IsNullOrEmpty(media.MediaPath))
                {
                    continue;
                }

                processed++;

                var relativePath = ToRelativePath(fileSystem, media.MediaPath);
                if (relativePath is null || !fileSystem.FileExists(relativePath))
                {
                    continue;
                }

                files.Add(new MediaFile(media.Id, media.Key, media.Name ?? string.Empty, media.MediaPath, relativePath, fileSystem.GetSize(relativePath)));
            }

            progress?.Report(processed);
            pageIndex++;
        }
        while (pageIndex * PageSize < total);

        var duplicates = new List<MediaCandidate>();

        foreach (var sizeGroup in files.GroupBy(file => file.Size).Where(group => group.Count() > 1))
        {
            cancellationToken.ThrowIfCancellationRequested();

            var byHash = new Dictionary<string, List<MediaFile>>();
            foreach (var file in sizeGroup)
            {
                var hash = ComputeHash(fileSystem, file.RelativePath);
                if (hash is null)
                {
                    continue;
                }

                if (!byHash.TryGetValue(hash, out var identical))
                {
                    identical = [];
                    byHash[hash] = identical;
                }
                identical.Add(file);
            }

            foreach (var identical in byHash.Values.Where(group => group.Count > 1))
            {
                // Keep the oldest node (lowest id); report the remaining identical copies as redundant.
                foreach (var redundant in identical.OrderBy(file => file.Id).Skip(1))
                {
                    duplicates.Add(new MediaCandidate(redundant.Key, redundant.Name, redundant.MediaPath, redundant.Size));
                }
            }
        }

        return Task.FromResult<IReadOnlyList<MediaCandidate>>(duplicates);
    }

    private static string? ToRelativePath(IFileSystem fileSystem, string mediaPath)
    {
        try
        {
            return fileSystem.GetRelativePath(mediaPath);
        }
        catch
        {
            return null;
        }
    }

    private static string? ComputeHash(IFileSystem fileSystem, string relativePath)
    {
        try
        {
            using var stream = fileSystem.OpenFile(relativePath);
            return Convert.ToHexString(SHA256.HashData(stream));
        }
        catch
        {
            return null;
        }
    }

    private readonly record struct MediaFile(int Id, Guid Key, string Name, string MediaPath, string RelativePath, long Size);
}
