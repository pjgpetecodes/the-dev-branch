using System.Text.Json.Serialization;

namespace TheDevBranch.Models;

public static class MediaCaptureHubEvents
{
    public const string SetCaptureConsent = "SetCaptureConsent";
    public const string CaptureConsentUpdated = "CaptureConsentUpdated";
    public const string UploadMomentCapture = "UploadMomentCapture";
    public const string MomentCaptureAdded = "MomentCaptureAdded";
    public const string MomentCaptureRejected = "MomentCaptureRejected";
    public const string RoundCaptureGalleryCleared = "RoundCaptureGalleryCleared";
}

public static class MediaCaptureLimits
{
    // Keep payloads well below default SignalR JSON message limits after base64 expansion.
    public const int MaxDecodedPayloadBytes = 20 * 1024;
    public const int MaxEncodedPayloadCharacters = 30_000;
    public const int MaxCaptureDurationMs = 7_000;
    public const int MaxCapturesPerRound = 40;
    public const int MaxRoundCaptureBytes = MaxDecodedPayloadBytes * MaxCapturesPerRound;

    // Round-scoped retention: keep only the active round in memory/gallery.
    public const int MaxRoundsRetainedInMemory = 1;
    public const int MaxTotalCapturesInMemory = MaxCapturesPerRound * MaxRoundsRetainedInMemory;
    public const int MaxTotalCaptureBytesInMemory = MaxRoundCaptureBytes * MaxRoundsRetainedInMemory;
}

public static class MediaCaptureMimeTypes
{
    public const string ImageWebp = "image/webp";
    public const string ImageJpeg = "image/jpeg";
    public const string VideoWebm = "video/webm";

    public static readonly IReadOnlySet<string> Allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        ImageWebp,
        ImageJpeg,
        VideoWebm
    };
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum MediaCaptureMoment
{
    Submit = 0,
    Reveal = 1,
    Winner = 2
}

public class MediaCaptureUploadRequest
{
    public string CaptureId { get; set; } = string.Empty;
    public int RoundNumber { get; set; }
    public MediaCaptureMoment Moment { get; set; }
    public bool ConsentGranted { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public int DurationMs { get; set; }
    public int PayloadByteCount { get; set; }
    public string PayloadBase64 { get; set; } = string.Empty;
}

public class MediaCaptureConsentUpdate
{
    public bool ConsentGranted { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public class MediaCaptureGalleryItem
{
    public string CaptureId { get; set; } = string.Empty;
    public int RoundNumber { get; set; }
    public MediaCaptureMoment Moment { get; set; }
    public string CapturedByConnectionId { get; set; } = string.Empty;
    public DateTime CapturedAtUtc { get; set; } = DateTime.UtcNow;
    public string MimeType { get; set; } = string.Empty;
    public int DurationMs { get; set; }
    public int PayloadByteCount { get; set; }
    public string PayloadBase64 { get; set; } = string.Empty;
}

public class MediaCaptureRejectedEvent
{
    public string? CaptureId { get; set; }
    public MediaCaptureRejection Rejection { get; set; } = new();
}

public class MediaCaptureRejection
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Field { get; set; }
    public int? Limit { get; set; }
}

public static class MediaCaptureRejections
{
    public const string ConsentRequiredCode = "consent_required";
    public const string InvalidRoundCode = "invalid_round";
    public const string InvalidMimeTypeCode = "invalid_mime_type";
    public const string PayloadTooLargeCode = "payload_too_large";
    public const string DurationTooLongCode = "duration_too_long";
    public const string RoundCapacityReachedCode = "round_capacity_reached";
    public const string HistoryCapacityReachedCode = "history_capacity_reached";
    public const string InvalidPayloadCode = "invalid_payload";
    public const string RoomNotFoundCode = "room_not_found";
    public const string NotRoomMemberCode = "not_room_member";

    public static MediaCaptureRejection ConsentRequired() => new()
    {
        Code = ConsentRequiredCode,
        Message = "Camera capture requires explicit consent.",
        Field = nameof(MediaCaptureUploadRequest.ConsentGranted)
    };

    public static MediaCaptureRejection InvalidRound() => new()
    {
        Code = InvalidRoundCode,
        Message = "Capture rejected because it is not for the active round.",
        Field = nameof(MediaCaptureUploadRequest.RoundNumber)
    };

    public static MediaCaptureRejection InvalidMimeType() => new()
    {
        Code = InvalidMimeTypeCode,
        Message = "Capture mime type is not supported.",
        Field = nameof(MediaCaptureUploadRequest.MimeType)
    };

    public static MediaCaptureRejection PayloadTooLarge() => new()
    {
        Code = PayloadTooLargeCode,
        Message = $"Capture payload exceeds {MediaCaptureLimits.MaxDecodedPayloadBytes} bytes.",
        Field = nameof(MediaCaptureUploadRequest.PayloadByteCount),
        Limit = MediaCaptureLimits.MaxDecodedPayloadBytes
    };

    public static MediaCaptureRejection DurationTooLong() => new()
    {
        Code = DurationTooLongCode,
        Message = $"Capture duration exceeds {MediaCaptureLimits.MaxCaptureDurationMs}ms.",
        Field = nameof(MediaCaptureUploadRequest.DurationMs),
        Limit = MediaCaptureLimits.MaxCaptureDurationMs
    };

    public static MediaCaptureRejection RoundCapacityReached() => new()
    {
        Code = RoundCapacityReachedCode,
        Message = $"Round gallery capacity of {MediaCaptureLimits.MaxCapturesPerRound} captures reached.",
        Limit = MediaCaptureLimits.MaxCapturesPerRound
    };

    public static MediaCaptureRejection HistoryCapacityReached() => new()
    {
        Code = HistoryCapacityReachedCode,
        Message = $"In-memory capture history limit of {MediaCaptureLimits.MaxTotalCapturesInMemory} reached.",
        Limit = MediaCaptureLimits.MaxTotalCapturesInMemory
    };

    public static MediaCaptureRejection InvalidPayload() => new()
    {
        Code = InvalidPayloadCode,
        Message = "Capture payload metadata does not match payload content."
    };

    public static MediaCaptureRejection RoomNotFound() => new()
    {
        Code = RoomNotFoundCode,
        Message = "Room not found."
    };

    public static MediaCaptureRejection NotRoomMember() => new()
    {
        Code = NotRoomMemberCode,
        Message = "Capture rejected because the player is not in the room."
    };
}
