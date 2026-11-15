// macOS: swift scripts/prepare-cinematic-video.swift INPUT.mp4 OUTPUT.mp4 [LAST_FRAME_SECONDS]
// Re-encodes original frames only. No generated cloud footage or image tail is appended.
import Foundation
import AVFoundation
import CoreVideo

guard (3...4).contains(CommandLine.arguments.count) else { fatalError("Usage: prepare-cinematic-video.swift INPUT OUTPUT [LAST_FRAME_SECONDS]") }
let source = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL
let destination = URL(fileURLWithPath: CommandLine.arguments[2]).standardizedFileURL
guard source != destination else { fatalError("Input and output must differ") }
let asset = AVURLAsset(url: source)
guard let track = asset.tracks(withMediaType: .video).first else { fatalError("No video track") }
let fps = max(1, Int(track.nominalFrameRate.rounded()))
let sourceDuration = CMTimeGetSeconds(asset.duration)
var duration = sourceDuration
if CommandLine.arguments.count == 4 {
 guard let cutoff = Double(CommandLine.arguments[3]), cutoff.isFinite, cutoff >= 0 else { fatalError("Invalid last-frame time") }
 duration = min(sourceDuration, cutoff + 1 / Double(fps))
}
let width = Int(track.naturalSize.width), height = Int(track.naturalSize.height)
let reader = try AVAssetReader(asset: asset)
reader.timeRange = CMTimeRange(start: .zero, duration: CMTime(seconds: duration, preferredTimescale: 600))
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
output.alwaysCopiesSampleData = false; reader.add(output)
try? FileManager.default.removeItem(at: destination)
let writer = try AVAssetWriter(outputURL: destination, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey:AVVideoCodecType.h264, AVVideoWidthKey:width, AVVideoHeightKey:height, AVVideoCompressionPropertiesKey:[AVVideoAverageBitRateKey:3400000,AVVideoMaxKeyFrameIntervalKey:4,AVVideoExpectedSourceFrameRateKey:fps,AVVideoProfileLevelKey:AVVideoProfileLevelH264HighAutoLevel,AVVideoAllowFrameReorderingKey:false]])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA,kCVPixelBufferWidthKey as String:width,kCVPixelBufferHeightKey as String:height])
writer.add(input)
guard writer.startWriting(), reader.startReading() else { fatalError("Start failed: \(String(describing:writer.error)) / \(String(describing:reader.error))") }
writer.startSession(atSourceTime: .zero)
var frames = 0
while let sample = output.copyNextSampleBuffer() {
 while !input.isReadyForMoreMediaData {
  if writer.status == .failed { fatalError("Encoder failed: \(String(describing:writer.error))") }
  Thread.sleep(forTimeInterval:0.003)
 }
 guard let buffer = CMSampleBufferGetImageBuffer(sample) else { continue }
 guard adaptor.append(buffer,withPresentationTime:CMSampleBufferGetPresentationTimeStamp(sample)) else { fatalError("Append failed: \(String(describing:writer.error))") }
 frames += 1
}
guard reader.status == .completed else { fatalError("Read failed: \(String(describing:reader.error))") }
input.markAsFinished()
let done = DispatchSemaphore(value:0)
writer.finishWriting { done.signal() }; done.wait()
guard writer.status == .completed else { fatalError("Finish failed: \(String(describing:writer.error))") }
print("Encoded \(frames) original frames, \(width)x\(height), \(fps)fps, fast-start H.264, four-frame GOP: \(destination.path)")
