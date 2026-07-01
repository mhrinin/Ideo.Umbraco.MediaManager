using Ideo.Umbraco.MediaManager.Models;

namespace Ideo.Umbraco.MediaManager.Interfaces;

public interface ICleanupService
{
    /// <summary>Moves orphaned media nodes to the recycle bin (reversible). Dry-run mutates nothing.</summary>
    CleanupResult DeleteMedia(IReadOnlyList<Guid> keys, bool dryRun);

    /// <summary>Hard-deletes orphaned physical files. Dry-run mutates nothing.</summary>
    CleanupResult DeleteFiles(IReadOnlyList<string> paths, bool dryRun);
}
