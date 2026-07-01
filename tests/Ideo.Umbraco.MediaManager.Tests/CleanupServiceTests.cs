using Ideo.Umbraco.MediaManager.Services;
using Moq;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;

namespace Ideo.Umbraco.MediaManager.Tests;

public class CleanupServiceTests
{
    private static (CleanupService service, Mock<IMediaService> media, Mock<IAuditService> audit) CreateService()
    {
        var media = new Mock<IMediaService>();
        var audit = new Mock<IAuditService>();
        var security = new Mock<IBackOfficeSecurityAccessor>();
        security.SetupGet(s => s.BackOfficeSecurity).Returns((IBackOfficeSecurity?)null);

        // MediaFileManager is not used by DeleteMedia, so it is safe to pass null here.
        var service = new CleanupService(media.Object, null!, audit.Object, security.Object);
        return (service, media, audit);
    }

    private static Mock<IMedia> MediaWith(Guid key, int id)
    {
        var media = new Mock<IMedia>();
        media.SetupGet(m => m.Key).Returns(key);
        media.SetupGet(m => m.Id).Returns(id);
        media.SetupGet(m => m.Name).Returns($"media-{id}");
        return media;
    }

    [Fact]
    public void DeleteMedia_DryRun_MutatesNothing()
    {
        var key = Guid.NewGuid();
        var (service, media, audit) = CreateService();
        media.Setup(m => m.GetById(key)).Returns(MediaWith(key, 1).Object);

        var result = service.DeleteMedia([key], dryRun: true);

        Assert.Equal(1, result.Affected);
        Assert.Empty(result.Errors);
        media.Verify(m => m.MoveToRecycleBin(It.IsAny<IMedia>(), It.IsAny<int>()), Times.Never);
        audit.Verify(a => a.Add(It.IsAny<AuditType>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public void DeleteMedia_Execute_MovesToRecycleBinAndAudits()
    {
        var key = Guid.NewGuid();
        var (service, media, audit) = CreateService();
        media.Setup(m => m.GetById(key)).Returns(MediaWith(key, 7).Object);
        media.Setup(m => m.MoveToRecycleBin(It.IsAny<IMedia>(), It.IsAny<int>()))
            .Returns(Attempt.Succeed<OperationResult>(null!));

        var result = service.DeleteMedia([key], dryRun: false);

        Assert.Equal(1, result.Affected);
        Assert.Empty(result.Errors);
        media.Verify(m => m.MoveToRecycleBin(It.Is<IMedia>(x => x.Id == 7), It.IsAny<int>()), Times.Once);
        audit.Verify(a => a.Add(AuditType.Delete, It.IsAny<int>(), 7, "media", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public void DeleteMedia_MissingMedia_RecordsErrorAndDoesNotDelete()
    {
        var key = Guid.NewGuid();
        var (service, media, _) = CreateService();
        media.Setup(m => m.GetById(key)).Returns((IMedia?)null);

        var result = service.DeleteMedia([key], dryRun: false);

        Assert.Equal(0, result.Affected);
        Assert.Single(result.Errors);
        media.Verify(m => m.MoveToRecycleBin(It.IsAny<IMedia>(), It.IsAny<int>()), Times.Never);
    }
}
