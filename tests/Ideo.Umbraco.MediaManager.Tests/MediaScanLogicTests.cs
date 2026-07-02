using Ideo.Umbraco.MediaManager.Services;

namespace Ideo.Umbraco.MediaManager.Tests;

public class MediaScanLogicTests
{
    [Fact]
    public void IsUnusedMedia_FileNotReferenced_IsOrphan()
    {
        var referenced = new HashSet<int> { 200, 300 };

        Assert.True(MediaScanLogic.IsUnusedMedia(100, "/media/abc/file.jpg", trashed: false, referenced));
    }

    [Fact]
    public void IsUnusedMedia_FileReferenced_IsNotOrphan()
    {
        var referenced = new HashSet<int> { 100, 200 };

        Assert.False(MediaScanLogic.IsUnusedMedia(100, "/media/abc/file.jpg", trashed: false, referenced));
    }

    [Fact]
    public void IsUnusedMedia_Trashed_IsNotOrphan()
    {
        // Already in the recycle bin — must not be re-flagged.
        Assert.False(MediaScanLogic.IsUnusedMedia(100, "/media/abc/file.jpg", trashed: true, new HashSet<int>()));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void IsUnusedMedia_Folder_IsNotOrphan(string? filePath)
    {
        Assert.False(MediaScanLogic.IsUnusedMedia(100, filePath, trashed: false, new HashSet<int>()));
    }

    [Fact]
    public void ExtractMediaKeys_UdiForm_ReturnsKey()
    {
        var key = Guid.NewGuid();
        var value = $"<img data-udi=\"umb://media/{key:N}\" />";

        Assert.Contains(key, MediaScanLogic.ExtractMediaKeys(value));
    }

    [Fact]
    public void ExtractMediaKeys_DashedGuid_ReturnsKey()
    {
        var key = Guid.NewGuid();
        var value = $"{{\"mediaKey\":\"{key}\"}}";

        Assert.Contains(key, MediaScanLogic.ExtractMediaKeys(value));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Just some text with no references.")]
    public void ExtractMediaKeys_NoReference_ReturnsEmpty(string? value)
    {
        Assert.Empty(MediaScanLogic.ExtractMediaKeys(value));
    }

    [Theory]
    [InlineData("cache", true)]
    [InlineData("1071/cache", true)]
    [InlineData("Cache/", true)]
    [InlineData("1071", false)]
    [InlineData("1071/images", false)]
    public void IsCacheDirectory_DetectsCacheFolder(string directory, bool expected)
    {
        Assert.Equal(expected, MediaScanLogic.IsCacheDirectory(directory));
    }
}
