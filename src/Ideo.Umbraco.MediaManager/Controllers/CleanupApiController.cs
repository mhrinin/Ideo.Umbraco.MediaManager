using Asp.Versioning;
using Ideo.Umbraco.MediaManager.Interfaces;
using Ideo.Umbraco.MediaManager.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Web.Common.Authorization;

namespace Ideo.Umbraco.MediaManager.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = Constants.ApiName)]
public class CleanupApiController(ICleanupService cleanupService) : MediaManagerApiControllerBase
{
    [HttpPost("cleanup/media")]
    public IActionResult DeleteMedia([FromBody] DeleteMediaRequest request)
        => Ok(cleanupService.DeleteMedia(request.Keys, request.DryRun));

    // Physical file deletion is irreversible (no recycle bin), so require elevated access.
    [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
    [HttpPost("cleanup/files")]
    public IActionResult DeleteFiles([FromBody] DeleteFilesRequest request)
        => Ok(cleanupService.DeleteFiles(request.Paths, request.DryRun));
}
