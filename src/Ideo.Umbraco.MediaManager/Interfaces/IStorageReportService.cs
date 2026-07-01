using Ideo.Umbraco.MediaManager.Models;

namespace Ideo.Umbraco.MediaManager.Interfaces;

public interface IStorageReportService
{
    Task<StorageReport> GenerateAsync(IProgress<int>? progress, CancellationToken cancellationToken);
}
