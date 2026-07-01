using Asp.Versioning;
using Ideo.Umbraco.MediaManager.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Ideo.Umbraco.MediaManager.Controllers;

[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = Constants.ApiName)]
public class ReportApiController(IStorageReportService reportService) : MediaManagerApiControllerBase
{
    [HttpGet("report/storage")]
    public async Task<IActionResult> Storage(CancellationToken cancellationToken)
        => Ok(await reportService.GenerateAsync(null, cancellationToken));
}
