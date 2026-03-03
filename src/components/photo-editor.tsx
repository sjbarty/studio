"use client";

import { useState, useRef, useCallback, useEffect, type ChangeEvent } from "react";
import Image from "next/image";
import { UploadCloud, Crop, Download, RotateCcw, Minimize2, Loader2, Image as ImageIcon, Scale, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type CropData = { x: number; y: number; width: number; height: number };
type DragState = { type: 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw'; startX: number; startY: number; startCrop: CropData } | null;
type CompressionPreset = 'low' | 'medium' | 'high' | 'custom';

const PRESET_QUALITIES: Record<CompressionPreset, number> = {
  low: 0.5,
  medium: 0.75,
  high: 0.92,
  custom: 0.85,
};

const placeholderImage = PlaceHolderImages.find(p => p.id === 'editor-placeholder');

export function PhotoEditor() {
  const [originalImage, setOriginalImage] = useState<{ file: File; url: string; width: number; height: number; } | null>(null);
  const [crop, setCrop] = useState<CropData | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>('high');
  const [customQuality, setCustomQuality] = useState(85);
  const [targetSize, setTargetSize] = useState('');
  const [processedSize, setProcessedSize] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputWidth, setOutputWidth] = useState('');
  const [outputHeight, setOutputHeight] = useState('');
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true);
  const [isEstimating, setIsEstimating] = useState(false);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = useCallback(() => {
    setOriginalImage(null);
    setCrop(null);
    setProcessedSize(null);
    setCompressionPreset('high');
    setCustomQuality(85);
    setTargetSize('');
    setOutputWidth('');
    setOutputHeight('');
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      return;
    }

    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.onload = () => {
      resetState();
      setOriginalImage({ file, url, width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  
  const initCrop = useCallback(() => {
    if (!originalImage || !imageContainerRef.current) return;
    const { clientWidth: containerWidth, clientHeight: containerHeight } = imageContainerRef.current;
    const imageAspectRatio = originalImage.width / originalImage.height;
    const containerAspectRatio = containerWidth / containerHeight;

    let imgDisplayWidth, imgDisplayHeight;
    if (imageAspectRatio > containerAspectRatio) {
      imgDisplayWidth = containerWidth;
      imgDisplayHeight = containerWidth / imageAspectRatio;
    } else {
      imgDisplayHeight = containerHeight;
      imgDisplayWidth = containerHeight * imageAspectRatio;
    }

    const initialCropWidth = imgDisplayWidth * 0.8;
    const initialCropHeight = imgDisplayHeight * 0.8;

    setCrop({
      x: (imgDisplayWidth - initialCropWidth) / 2,
      y: (imgDisplayHeight - initialCropHeight) / 2,
      width: initialCropWidth,
      height: initialCropHeight,
    });
  }, [originalImage]);

  useEffect(() => {
    if (originalImage) initCrop();
  }, [originalImage, initCrop]);

  useEffect(() => {
    const container = imageContainerRef.current;
    const observer = new ResizeObserver(() => initCrop());
    if (container) observer.observe(container);
    return () => {
      if (container) observer.unobserve(container);
    };
  }, [initCrop]);
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: DragState['type']) => {
    e.preventDefault();
    if (!crop) return;
    setDragState({ type, startX: e.clientX, startY: e.clientY, startCrop: { ...crop } });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !crop || !imageContainerRef.current) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    let newCrop = { ...dragState.startCrop };
    
    const { clientWidth: cW, clientHeight: cH } = imageContainerRef.current;
    const { width: oW, height: oH } = originalImage!;
    const scaleX = oW / cW;
    const scaleY = oH / cH;
    const imageAspectRatio = oW / oH;
    const containerAspectRatio = cW / cH;
    let imgDisplayWidth, imgDisplayHeight;
    if (imageAspectRatio > containerAspectRatio) {
      imgDisplayWidth = cW;
      imgDisplayHeight = cW / imageAspectRatio;
    } else {
      imgDisplayHeight = cH;
      imgDisplayWidth = cH * imageAspectRatio;
    }
    const imgX = (cW - imgDisplayWidth) / 2;
    const imgY = (cH - imgDisplayHeight) / 2;

    const move = (x: number, y: number) => {
        return {
            x: Math.max(imgX, Math.min(x, imgX + imgDisplayWidth - newCrop.width)),
            y: Math.max(imgY, Math.min(y, imgY + imgDisplayHeight - newCrop.height)),
        };
    };

    if (dragState.type === 'move') {
        const moved = move(dragState.startCrop.x + dx, dragState.startCrop.y + dy);
        newCrop.x = moved.x;
        newCrop.y = moved.y;
    } else {
        // Handle resizing
        if (dragState.type.includes('w')) {
            newCrop.x = Math.min(dragState.startCrop.x + dx, dragState.startCrop.x + dragState.startCrop.width - 20);
            newCrop.width = Math.max(20, dragState.startCrop.width - (newCrop.x - dragState.startCrop.x));
        }
        if (dragState.type.includes('n')) {
            newCrop.y = Math.min(dragState.startCrop.y + dy, dragState.startCrop.y + dragState.startCrop.height - 20);
            newCrop.height = Math.max(20, dragState.startCrop.height - (newCrop.y - dragState.startCrop.y));
        }
        if (dragState.type.includes('e')) {
            newCrop.width = Math.max(20, dragState.startCrop.width + dx);
        }
        if (dragState.type.includes('s')) {
            newCrop.height = Math.max(20, dragState.startCrop.height + dy);
        }

        // Boundary checks for resize
        if (newCrop.x < imgX) {
            newCrop.width -= imgX - newCrop.x;
            newCrop.x = imgX;
        }
        if (newCrop.y < imgY) {
            newCrop.height -= imgY - newCrop.y;
            newCrop.y = imgY;
        }
        if (newCrop.x + newCrop.width > imgX + imgDisplayWidth) {
            newCrop.width = imgX + imgDisplayWidth - newCrop.x;
        }
        if (newCrop.y + newCrop.height > imgY + imgDisplayHeight) {
            newCrop.height = imgY + imgDisplayHeight - newCrop.y;
        }
    }
    setCrop(newCrop);
  }, [dragState, crop, originalImage]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (crop && originalImage && imageContainerRef.current) {
        const { clientWidth: containerWidth, clientHeight: containerHeight } = imageContainerRef.current;
        const imageAspectRatio = originalImage.width / originalImage.height;
        const containerAspectRatio = containerWidth / containerHeight;
        
        let imgDisplayWidth;
        if (imageAspectRatio > containerAspectRatio) {
            imgDisplayWidth = containerWidth;
        } else {
            imgDisplayWidth = containerHeight * imageAspectRatio;
        }
        
        const scale = originalImage.width / imgDisplayWidth;
        const w = Math.round(crop.width * scale);
        const h = Math.round(crop.height * scale);
        setOutputWidth(String(w));
        setOutputHeight(String(h));
    }
  }, [crop, originalImage]);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = e.target.value;
    setOutputWidth(newWidth);
    if (aspectRatioLocked && crop) {
        const newWidthNum = parseInt(newWidth, 10);
        if (!isNaN(newWidthNum) && newWidthNum > 0 && crop.height > 0) {
            const aspectRatio = crop.width / crop.height;
            setOutputHeight(String(Math.round(newWidthNum / aspectRatio)));
        }
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newHeight = e.target.value;
      setOutputHeight(newHeight);
      if (aspectRatioLocked && crop) {
          const newHeightNum = parseInt(newHeight, 10);
          if (!isNaN(newHeightNum) && newHeightNum > 0) {
              const aspectRatio = crop.width / crop.height;
              setOutputWidth(String(Math.round(newHeightNum * aspectRatio)));
          }
      }
  };

  const processImage = useCallback(async () => {
    if (!originalImage || !crop || !imageContainerRef.current) return null;
    
    const image = document.createElement('img');
    image.src = originalImage.url;
    await new Promise(resolve => image.onload = resolve);
    
    const { clientWidth: containerWidth, clientHeight: containerHeight } = imageContainerRef.current;
    const imageAspectRatio = originalImage.width / originalImage.height;
    const containerAspectRatio = containerWidth / containerHeight;
    
    let imgDisplayWidth, imgDisplayHeight, imgX, imgY;
    if (imageAspectRatio > containerAspectRatio) {
        imgDisplayWidth = containerWidth;
        imgDisplayHeight = containerWidth / imageAspectRatio;
    } else {
        imgDisplayHeight = containerHeight;
        imgDisplayWidth = containerHeight * imageAspectRatio;
    }
    imgX = (containerWidth - imgDisplayWidth) / 2;
    imgY = (containerHeight - imgDisplayHeight) / 2;
    
    const scale = originalImage.width / imgDisplayWidth;

    let finalWidth, finalHeight;

    if (compressionPreset === 'custom') {
        finalWidth = parseInt(outputWidth, 10);
        finalHeight = parseInt(outputHeight, 10);
    } else {
        finalWidth = Math.round(crop.width * scale);
        finalHeight = Math.round(crop.height * scale);
    }

    if (isNaN(finalWidth) || isNaN(finalHeight) || finalWidth <= 0 || finalHeight <= 0) {
        return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(
      image,
      (crop.x - imgX) * scale, (crop.y - imgY) * scale, // source x, y
      crop.width * scale, crop.height * scale, // source width, height
      0, 0, // destination x, y
      canvas.width, canvas.height // destination width, height
    );
    
    const mimeType = originalImage.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const targetSizeKB = parseInt(targetSize, 10);
    const useCustomTargetSize = compressionPreset === 'custom' && !isNaN(targetSizeKB) && targetSizeKB > 0;

    if (useCustomTargetSize) {
        const getBlobForQuality = (q: number): Promise<Blob | null> => new Promise(res => canvas.toBlob(blob => res(blob), mimeType, q));

        let minQuality = 0;
        let maxQuality = 1;
        let quality = 0.5; // Start in the middle
        let bestMatch: {blob: Blob, quality: number} | null = null;

        for (let i = 0; i < 8; i++) { // 8 iterations of binary search is usually enough
            const currentBlob = await getBlobForQuality(quality);
            if (!currentBlob) continue;
            
            if (!bestMatch || Math.abs(currentBlob.size / 1024 - targetSizeKB) < Math.abs(bestMatch.blob.size / 1024 - targetSizeKB)) {
                bestMatch = {blob: currentBlob, quality: quality};
            }

            if (Math.abs(currentBlob.size / 1024 - targetSizeKB) < (targetSizeKB * 0.02)) { // within 2% tolerance
                break;
            }

            if (currentBlob.size / 1024 > targetSizeKB) {
                maxQuality = quality;
            } else {
                minQuality = quality;
            }
            quality = (minQuality + maxQuality) / 2;
        }
        
        if (bestMatch) {
            const dataUrl = canvas.toDataURL(mimeType, bestMatch.quality);
            return { blob: bestMatch.blob, dataUrl };
        }
        return null;

    } else {
        const quality = compressionPreset === 'custom' ? customQuality / 100 : PRESET_QUALITIES[compressionPreset];
        const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, mimeType, quality));
        if (!blob) return null;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        return { blob, dataUrl };
    }
  }, [originalImage, crop, compressionPreset, customQuality, outputWidth, outputHeight, targetSize]);

  const updateProcessedSize = useCallback(async () => {
    setIsEstimating(true);
    const result = await processImage();
    if (result) {
        setProcessedSize((result.blob.size / 1024).toFixed(2) + ' KB');
    } else {
        setProcessedSize('...');
    }
    setIsEstimating(false);
  }, [processImage]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (originalImage && crop) {
        updateProcessedSize();
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [crop, compressionPreset, customQuality, originalImage, updateProcessedSize, outputWidth, outputHeight, targetSize]);

  const handleDownload = async () => {
    setIsProcessing(true);
    const result = await processImage();
    if (result) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(result.blob);
        const fileExtension = originalImage?.file.name.split('.').pop() || 'jpg';
        link.download = `OptiPic_${Date.now()}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Could not process image for download. Please check if dimensions are valid." });
    }
    setIsProcessing(false);
  };
  
  if (!originalImage) {
    return (
      <div className="container py-12 px-4 md:px-6">
        <div
          className="relative flex flex-col items-center justify-center w-full min-h-[400px] lg:min-h-[500px] rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-card overflow-hidden transition-colors hover:border-primary/50 hover:bg-primary/5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            handleFileChange({ target: { files } } as any);
          }}
        >
          {placeholderImage && <Image src={placeholderImage.imageUrl} alt="Abstract background" data-ai-hint={placeholderImage.imageHint} fill className="object-cover opacity-10 dark:opacity-5" />}
          <div 
            className="relative z-10 flex flex-col items-center justify-center p-8 text-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <UploadCloud className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-2 font-headline">Click or drag image to upload</h3>
            <p className="text-muted-foreground">Supports: PNG, JPG, WEBP. Your files are processed locally.</p>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="overflow-hidden">
            <div ref={imageContainerRef} className="relative w-full aspect-[4/3] bg-muted/30 flex items-center justify-center">
              {originalImage && (
                <Image
                  src={originalImage.url}
                  alt="Uploaded image"
                  width={originalImage.width}
                  height={originalImage.height}
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                />
              )}
              {crop && (
                <div 
                    className="absolute border-2 border-accent cursor-move select-none"
                    style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                >
                    {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(dir => (
                        <div key={dir} className={cn('absolute w-3 h-3 bg-accent rounded-full',
                            dir.includes('n') && '-top-1.5', dir.includes('s') && '-bottom-1.5', !dir.includes('n') && !dir.includes('s') && 'top-1/2 -translate-y-1/2',
                            dir.includes('w') && '-left-1.5', dir.includes('e') && '-right-1.5', !dir.includes('w') && !dir.includes('e') && 'left-1/2 -translate-x-1/2',
                            (dir === 'nw' || dir === 'se') && 'cursor-nwse-resize', (dir === 'ne' || dir === 'sw') && 'cursor-nesw-resize',
                            (dir === 'n' || dir === 's') && 'cursor-ns-resize', (dir === 'e' || dir === 'w') && 'cursor-ew-resize'
                        )} onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, dir as any); }} />
                    ))}
                </div>
              )}
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Crop size={20} /> Crop</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full" onClick={initCrop}><RotateCcw className="mr-2" /> Reset Crop</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Minimize2 size={20}/> Compress & Resize</CardTitle>
                    <CardDescription>Reduce file size and optionally resize.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <RadioGroup value={compressionPreset} onValueChange={(v) => setCompressionPreset(v as CompressionPreset)}>
                        <div className="grid grid-cols-2 gap-2">
                        {['low', 'medium', 'high', 'custom'].map(p => (
                            <div key={p}>
                                <RadioGroupItem value={p} id={p} className="sr-only" />
                                <Label htmlFor={p} className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    compressionPreset === p && "border-primary"
                                )}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Label>
                            </div>
                        ))}
                        </div>
                    </RadioGroup>
                    {compressionPreset === 'custom' && (
                        <div className="pt-4 space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="quality" className={cn(!!targetSize && "text-muted-foreground")}>Quality</Label>
                                    <span className={cn("text-sm font-medium", !!targetSize ? "text-muted-foreground" : "text-primary")}>{customQuality}%</span>
                                </div>
                                <Slider id="quality" defaultValue={[customQuality]} max={100} min={1} step={1} onValueChange={(v) => setCustomQuality(v[0])} disabled={!!targetSize} />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">
                                    Or
                                    </span>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="targetSize">Target Size (KB)</Label>
                                <Input id="targetSize" type="number" value={targetSize} onChange={(e) => setTargetSize(e.target.value)} placeholder="e.g. 500" />
                                <p className="text-xs text-muted-foreground">Attempts to match size. May not be exact.</p>
                            </div>
                            
                            <Separator/>

                            <div className="space-y-3">
                                <Label>Custom Dimensions</Label>
                                <div className="flex items-center gap-2">
                                    <div className="grid gap-1.5 flex-1">
                                        <Label htmlFor="width" className="text-xs text-muted-foreground">Width</Label>
                                        <Input id="width" type="number" value={outputWidth} onChange={handleWidthChange} placeholder="e.g. 1920" />
                                    </div>
                                    <div className="grid gap-1.5 flex-1">
                                        <Label htmlFor="height" className="text-xs text-muted-foreground">Height</Label>
                                        <Input id="height" type="number" value={outputHeight} onChange={handleHeightChange} placeholder="e.g. 1080" />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="self-end shrink-0"
                                        onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                                        aria-label="Toggle aspect ratio lock"
                                    >
                                        {aspectRatioLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Download size={20}/> Export</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm p-3 rounded-md bg-background">
                        <span className="text-muted-foreground">Estimated Size:</span>
                        {isEstimating ? <Loader2 className="animate-spin w-4 h-4"/> : <span className="font-semibold text-primary">{processedSize || '...'}</span>}
                    </div>
                    <Button className="w-full" size="lg" onClick={handleDownload} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Download className="mr-2"/>}
                        Download Image
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={resetState}>Start Over</Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
