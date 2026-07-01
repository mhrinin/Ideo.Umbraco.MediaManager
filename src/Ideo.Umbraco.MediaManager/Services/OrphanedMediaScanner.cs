using Ideo.Umbraco.MediaManager.Interfaces;
using Ideo.Umbraco.MediaManager.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Models.Entities;
using Umbraco.Cms.Core.Services;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace Ideo.Umbraco.MediaManager.Services;

/// <summary>
/// Finds media nodes that nothing references. For performance it pages lightweight
/// <see cref="IMediaEntitySlim"/> rows via <see cref="IEntityService"/> (no property hydration),
/// excludes the recycle bin at the query level, and only reads file sizes for the orphan set.
/// </summary>
public sealed class OrphanedMediaScanner(
    IEntityService entityService,
    IRelationService relationService,
    MediaFileManager mediaFileManager) : IOrphanedMediaScanner
{
    private const int PageSize = 500;

    public Task<IReadOnlyList<MediaCandidate>> ScanAsync(IProgress<int>? progress, CancellationToken cancellationToken)
    {
        var referencedIds = GetReferencedMediaIds();
        var fileSystem = mediaFileManager.FileSystem;

        var candidates = new List<MediaCandidate>();
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
                // Only file-backed media are candidates; skip folders and non-media rows.
                if (entity is not IMediaEntitySlim media || string.IsNullOrEmpty(media.MediaPath))
                {
                    continue;
                }

                processed++;

                if (!MediaScanLogic.IsOrphanMedia(media.Id, media.MediaPath, media.Trashed, referencedIds))
                {
                    continue;
                }

                candidates.Add(new MediaCandidate(
                    media.Key,
                    media.Name ?? string.Empty,
                    media.MediaPath,
                    GetSize(fileSystem, media.MediaPath)));
            }

            progress?.Report(processed);
            pageIndex++;
        }
        while (pageIndex * PageSize < total);

        return Task.FromResult<IReadOnlyList<MediaCandidate>>(candidates);
    }

    private HashSet<int> GetReferencedMediaIds()
    {
        var relations = relationService.GetByRelationTypeAlias(UmbracoConstants.Conventions.RelationTypes.RelatedMediaAlias)
            ?? [];

        return relations.Select(relation => relation.ChildId).ToHashSet();
    }

    private static long GetSize(IFileSystem fileSystem, string mediaPath)
    {
        try
        {
            var relativePath = fileSystem.GetRelativePath(mediaPath);
            return fileSystem.FileExists(relativePath) ? fileSystem.GetSize(relativePath) : 0;
        }
        catch
        {
            return 0;
        }
    }
}
