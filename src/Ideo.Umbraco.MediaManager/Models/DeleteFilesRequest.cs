namespace Ideo.Umbraco.MediaManager.Models;

public sealed record DeleteFilesRequest(IReadOnlyList<string> Paths, bool DryRun);
