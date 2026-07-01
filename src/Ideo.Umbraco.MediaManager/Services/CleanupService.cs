using Ideo.Umbraco.MediaManager.Interfaces;
using Ideo.Umbraco.MediaManager.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace Ideo.Umbraco.MediaManager.Services;

public sealed class CleanupService(
    IMediaService mediaService,
    MediaFileManager mediaFileManager,
    IAuditService auditService,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor) : ICleanupService
{
    private const string MediaEntityType = "media";
    private const string MediaFileEntityType = "media-file";

    public CleanupResult DeleteMedia(IReadOnlyList<Guid> keys, bool dryRun)
    {
        var userId = CurrentUserId();
        var errors = new List<string>();
        var affected = 0;

        foreach (var key in keys)
        {
            var media = mediaService.GetById(key);
            if (media is null)
            {
                errors.Add($"Media '{key}' was not found.");
                continue;
            }

            if (dryRun)
            {
                affected++;
                continue;
            }

            var result = mediaService.MoveToRecycleBin(media, userId);
            if (!result.Success)
            {
                errors.Add($"Failed to move media '{key}' to the recycle bin.");
                continue;
            }

            auditService.Add(
                AuditType.Delete,
                userId,
                media.Id,
                MediaEntityType,
                $"Media Manager: moved orphaned media '{media.Name}' to the recycle bin.",
                string.Empty);
            affected++;
        }

        return new CleanupResult(affected, errors);
    }

    public CleanupResult DeleteFiles(IReadOnlyList<string> paths, bool dryRun)
    {
        var userId = CurrentUserId();
        var fileSystem = mediaFileManager.FileSystem;
        var errors = new List<string>();
        var affected = 0;

        foreach (var path in paths)
        {
            if (!fileSystem.FileExists(path))
            {
                errors.Add($"File '{path}' was not found.");
                continue;
            }

            if (dryRun)
            {
                affected++;
                continue;
            }

            fileSystem.DeleteFile(path);
            auditService.Add(
                AuditType.Delete,
                userId,
                UmbracoConstants.System.Root,
                MediaFileEntityType,
                $"Media Manager: deleted orphaned physical file '{path}'.",
                string.Empty);
            affected++;
        }

        return new CleanupResult(affected, errors);
    }

    private int CurrentUserId()
        => backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Id ?? UmbracoConstants.Security.SuperUserId;
}
