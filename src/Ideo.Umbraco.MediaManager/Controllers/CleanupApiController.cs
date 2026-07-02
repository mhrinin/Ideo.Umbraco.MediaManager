using Asp.Versioning;
using Ideo.Umbraco.MediaManager.Interfaces;
using Ideo.Umbraco.MediaManager.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.Security.Authorization;
using Umbraco.Cms.Web.Common.Authorization;
using Umbraco.Extensions;

namespace Ideo.Umbraco.MediaManager.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = Constants.ApiName)]
public class CleanupApiController(
    ICleanupService cleanupService,
    IAuthorizationService authorizationService) : MediaManagerApiControllerBase
{
    [HttpPost("cleanup/media")]
    public async Task<IActionResult> DeleteMedia([FromBody] DeleteMediaRequest request)
    {
        // Section access alone is not enough: honour the user's media start nodes and per-node
        // permissions, exactly like Umbraco's own media delete endpoints.
        var authorization = await authorizationService.AuthorizeResourceAsync(
            User,
            MediaPermissionResource.WithKeys(request.Keys),
            AuthorizationPolicies.MediaPermissionByResource);

        if (!authorization.Succeeded)
        {
            return Forbid();
        }

        return Ok(await cleanupService.DeleteMediaAsync(request.Keys, request.DryRun));
    }

    // Physical file deletion is irreversible (no recycle bin), so require elevated access.
    [Authorize(Policy = AuthorizationPolicies.SectionAccessSettings)]
    [HttpPost("cleanup/files")]
    public async Task<IActionResult> DeleteFiles([FromBody] DeleteFilesRequest request)
        => Ok(await cleanupService.DeleteFilesAsync(request.JobId, request.Paths, request.DryRun));
}
