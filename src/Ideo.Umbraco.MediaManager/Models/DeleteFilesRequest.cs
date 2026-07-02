namespace Ideo.Umbraco.MediaManager.Models;

public sealed record DeleteFilesRequest(Guid JobId, IReadOnlyList<string> Paths, bool DryRun);
