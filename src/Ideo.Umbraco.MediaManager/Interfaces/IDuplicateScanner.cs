using Ideo.Umbraco.MediaManager.Models;

namespace Ideo.Umbraco.MediaManager.Interfaces;

public interface IDuplicateScanner
{
    Task<IReadOnlyList<MediaCandidate>> ScanAsync(IProgress<int>? progress, CancellationToken cancellationToken);
}
