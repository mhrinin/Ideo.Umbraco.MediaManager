namespace Ideo.Umbraco.MediaManager.Models;

public sealed record DeleteMediaRequest(IReadOnlyList<Guid> Keys, bool DryRun);
