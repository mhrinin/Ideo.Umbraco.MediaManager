namespace Ideo.Umbraco.MediaManager.Models;

public sealed record CleanupResult(int Affected, IReadOnlyList<string> Errors);
