using Ideo.Umbraco.MediaManager.Interfaces;
using Ideo.Umbraco.MediaManager.Models;
using Umbraco.Cms.Core.IO;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using UmbracoConstants = Umbraco.Cms.Core.Constants;

namespace Ideo.Umbraco.MediaManager.Services;

/// <summary>
/// Umbraco 13 cleanup: the legacy backoffice has no <c>IMediaEditingService</c>/async audit APIs, so
/// this uses the synchronous, int-user-id services (<see cref="IMediaService.MoveToRecycleBin"/> and
/// <see cref="IAuditService.Add"/>). Media nodes go to the Recycle Bin (reversible); orphan files are
/// deleted from disk only when present in the referenced scan result. Every action is audited.
/// </summary>
public sealed class CleanupService(
    IMediaService mediaService,
    MediaFileManager mediaFileManager,
    IAuditService auditService,
    IBackOfficeSecurityAccessor backOfficeSecurityAccessor,
    IScanJobManager scanJobManager) : ICleanupService
{
    private const string MediaEntityType = "media";
    private const string MediaFileEntityType = "media-file";

    public Task<CleanupResult> DeleteMediaAsync(IReadOnlyList<Guid> keys, bool dryRun)
    {
        if (dryRun)
        {
            return Task.FromResult(new CleanupResult(keys.Count, []));
        }

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

            var attempt = mediaService.MoveToRecycleBin(media, userId);
            if (!attempt.Success)
            {
                errors.Add($"Media '{media.Name}' could not be moved to the recycle bin.");
                continue;
            }

            auditService.Add(
                AuditType.Delete,
                userId,
                media.Id,
                MediaEntityType,
                $"Media Manager: moved unused media '{media.Name}' to the recycle bin.",
                string.Empty);
            affected++;
        }

        return Task.FromResult(new CleanupResult(affected, errors));
    }

    public Task<CleanupResult> DeleteFilesAsync(Guid jobId, IReadOnlyList<string> paths, bool dryRun)
    {
        // The stored scan result is the allowlist: only files the orphaned-files scan actually
        // flagged can be deleted, never arbitrary paths supplied by the client.
        var scanResult = scanJobManager.GetResult(jobId);
        if (scanResult is null || scanResult.Type != ScanType.OrphanedFiles)
        {
            return Task.FromResult(new CleanupResult(0, ["The orphaned-files scan result is no longer available. Rescan and try again."]));
        }

        var allowedPaths = scanResult.Files.Select(file => file.Path).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var fileSystem = mediaFileManager.FileSystem;
        var userId = CurrentUserId();
        var errors = new List<string>();
        var affected = 0;

        foreach (var path in paths)
        {
            if (!allowedPaths.Contains(path))
            {
                errors.Add($"File '{path}' is not part of the scan result and was skipped.");
                continue;
            }

            try
            {
                if (!fileSystem.FileExists(path))
                {
                    errors.Add($"File '{path}' was not found.");
                    continue;
                }

                if (!dryRun)
                {
                    fileSystem.DeleteFile(path);
                    auditService.Add(
                        AuditType.Delete,
                        userId,
                        UmbracoConstants.System.Root,
                        MediaFileEntityType,
                        $"Media Manager: deleted orphaned physical file '{path}'.",
                        string.Empty);
                }

                affected++;
            }
            catch (Exception ex)
            {
                errors.Add($"File '{path}' could not be deleted: {ex.Message}");
            }
        }

        return Task.FromResult(new CleanupResult(affected, errors));
    }

#pragma warning disable CS0618 // SuperUserId is a last-resort fallback; the sync audit API takes an int user id.
    private int CurrentUserId()
        => backOfficeSecurityAccessor.BackOfficeSecurity?.CurrentUser?.Id ?? UmbracoConstants.Security.SuperUserId;
#pragma warning restore CS0618
}
