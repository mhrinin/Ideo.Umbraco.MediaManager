using Ideo.Umbraco.MediaManager.Interfaces;
using Ideo.Umbraco.MediaManager.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Entities;
using Umbraco.Cms.Core.Services;

namespace Ideo.Umbraco.MediaManager.Services;

/// <summary>
/// Finds physical files on the media filesystem that no media node owns. Owned paths are collected
/// from lightweight <see cref="IMediaEntitySlim"/> rows (including the recycle bin, whose files are
/// still on disk), so no full media entities are hydrated.
/// </summary>
public sealed class OrphanedFileScanner(
    MediaFileManager mediaFileManager,
    IEntityService entityService) : IOrphanedFileScanner
{
    private const int PageSize = 500;

    public Task<IReadOnlyList<FileCandidate>> ScanAsync(IProgress<int>? progress, CancellationToken cancellationToken)
    {
        var fileSystem = mediaFileManager.FileSystem;
        var ownedPaths = CollectOwnedPaths(fileSystem, progress, cancellationToken);

        var candidates = new List<FileCandidate>();
        foreach (var relativePath in WalkFiles(fileSystem, string.Empty, cancellationToken))
        {
            if (ownedPaths.Contains(NormalizeSeparators(relativePath)))
            {
                continue;
            }

            candidates.Add(new FileCandidate(relativePath, fileSystem.GetSize(relativePath)));
        }

        return Task.FromResult<IReadOnlyList<FileCandidate>>(candidates);
    }

    private HashSet<string> CollectOwnedPaths(IFileSystem fileSystem, IProgress<int>? progress, CancellationToken cancellationToken)
    {
        // The filesystem itself resolves stored media URLs (e.g. "/media/xyz/f.jpg" — or a custom
        // media root like "/assets/…") to its own relative paths, so owned and walked paths always
        // agree regardless of the configured UmbracoMediaPath.
        var owned = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
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
                includeTrashed: true);

            foreach (var entity in page)
            {
                if (entity is IMediaEntitySlim media && !string.IsNullOrEmpty(media.MediaPath)
                    && ToRelativePath(fileSystem, media.MediaPath) is { } relativePath)
                {
                    owned.Add(NormalizeSeparators(relativePath));
                }

                processed++;
            }

            progress?.Report(processed);
            pageIndex++;
        }
        while (pageIndex * PageSize < total);

        return owned;
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

    private static string NormalizeSeparators(string path) => path.Replace('\\', '/');

    private static IEnumerable<string> WalkFiles(IFileSystem fileSystem, string path, CancellationToken cancellationToken)
    {
        foreach (var file in fileSystem.GetFiles(path))
        {
            cancellationToken.ThrowIfCancellationRequested();
            yield return file;
        }

        foreach (var directory in fileSystem.GetDirectories(path))
        {
            if (MediaScanLogic.IsCacheDirectory(directory))
            {
                continue;
            }

            foreach (var file in WalkFiles(fileSystem, directory, cancellationToken))
            {
                yield return file;
            }
        }
    }
}
