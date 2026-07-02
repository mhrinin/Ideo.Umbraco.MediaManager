using Ideo.Umbraco.MediaManager.Models;

namespace Ideo.Umbraco.MediaManager.Interfaces;

public interface ICleanupService
{
    /// <summary>Moves orphaned media nodes to the recycle bin (reversible). Dry-run mutates nothing.</summary>
    Task<CleanupResult> DeleteMediaAsync(IReadOnlyList<Guid> keys, bool dryRun);

    /// <summary>
    /// Hard-deletes orphaned physical files. Only paths present in the orphaned-files scan result
    /// identified by <paramref name="jobId"/> are accepted — the scan result is the server-side
    /// allowlist, so clients cannot delete arbitrary files. Dry-run mutates nothing.
    /// </summary>
    Task<CleanupResult> DeleteFilesAsync(Guid jobId, IReadOnlyList<string> paths, bool dryRun);
}
