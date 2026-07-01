using Ideo.Umbraco.MediaManager.Interfaces;
using Ideo.Umbraco.MediaManager.Services;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Ideo.Umbraco.MediaManager;

public class Composer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddScoped<IOrphanedMediaScanner, OrphanedMediaScanner>();
        builder.Services.AddScoped<IOrphanedFileScanner, OrphanedFileScanner>();

        builder.Services.AddSingleton<ScanJobManager>();
        builder.Services.AddSingleton<IScanJobManager>(provider => provider.GetRequiredService<ScanJobManager>());
        builder.Services.AddHostedService(provider => provider.GetRequiredService<ScanJobManager>());

        RegisterControllers(builder);
    }

    // Ensure this assembly's API controllers are discovered as an MVC application part. When the
    // package is consumed as a project reference the part is not auto-added; guard against
    // double-registration for the case where it already is (e.g. installed as a NuGet package).
    private static void RegisterControllers(IUmbracoBuilder builder)
    {
        var assembly = typeof(Composer).Assembly;
        var mvcBuilder = builder.Services.AddControllers();

        var alreadyRegistered = mvcBuilder.PartManager.ApplicationParts
            .OfType<AssemblyPart>()
            .Any(part => part.Assembly == assembly);

        if (!alreadyRegistered)
        {
            mvcBuilder.AddApplicationPart(assembly);
        }
    }
}
