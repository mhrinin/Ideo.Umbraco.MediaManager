namespace Ideo.Umbraco.MediaManager.Interfaces;

public interface IMediaReferenceCollector
{
    HashSet<Guid> Collect(CancellationToken cancellationToken);
}
