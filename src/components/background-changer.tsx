"use client";

import { useState, useRef, useCallback, type ChangeEvent, useEffect } from "react";
import Image from "next/image";
import { UploadCloud, Download, Loader2, Palette, Trash2, ImagePlus, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { removeBackground } from "@imgly/background-removal";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";

const placeholderImage = PlaceHolderImages.find(p => p.id === 'editor-placeholder');

const BG_COLORS = [
  "#FFFFFF", "#E2E8F0", "#FECACA", "#FED7AA", "#FEF08A", "#D9F99D", "#A7F3D0", "#A5F3FC", "#BFDBFE", "#C7D2FE", "#FBCFE8"
];

interface CustomBg {
  src: string;
  width: number;
  height: number;
  zoom: number;
  pan: { x: number; y: number };
}
type DragState = { type: 'pan'; startX: number; startY: number; startPan: { x: number, y: number } } | null;
type TouchState = {
    startPan?: { x: number; y: number };
    startZoom?: number;
    startDist?: number;
    startX?: number;
    startY?: number;
} | null;

export function BackgroundChanger() {
  const [originalImage, setOriginalImage] = useState<{ file: File; width: number; height: number; } | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>("#FFFFFF");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customBgImage, setCustomBgImage] = useState<CustomBg | null>(null);

  const [dragState, setDragState] = useState<DragState>(null);
  const [touchState, setTouchState] = useState<TouchState>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const customBgFileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDisplayRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const resetState = useCallback(() => {
    setOriginalImage(null);
    if (processedImage) {
      URL.revokeObjectURL(processedImage);
    }
    setProcessedImage(null);
    setBgColor("#FFFFFF");
    setIsProcessing(false);
    setCustomBgImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [processedImage]);

  useEffect(() => {
    return () => {
      if (processedImage) URL.revokeObjectURL(processedImage);
    };
  }, [processedImage]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      if(file) toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.onload = () => {
      resetState();
      setOriginalImage({ file, width: img.width, height: img.height });
      URL.revokeObjectURL(tempUrl);
      
      setIsProcessing(true);
      removeBackground(file)
        .then((blob: Blob) => setProcessedImage(URL.createObjectURL(blob)))
        .catch((error) => {
          console.error(error);
          toast({ variant: "destructive", title: "Background Removal Failed", description: "Could not process the image. Please try another one." });
          resetState();
        })
        .finally(() => setIsProcessing(false));
    };
    img.onerror = () => {
        toast({ variant: "destructive", title: "Invalid Image", description: "Could not load the selected file." });
        URL.revokeObjectURL(tempUrl);
        resetState();
    }
    img.src = tempUrl;
  };

  const handleCustomBgChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      if (file) toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const url = loadEvent.target?.result as string;
      const img = document.createElement('img');
      img.onload = () => {
        setCustomBgImage({
          src: url,
          width: img.width,
          height: img.height,
          zoom: 1,
          pan: { x: 0, y: 0 },
        });
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    if(customBgFileInputRef.current) customBgFileInputRef.current.value = "";
  };

  const handleDownload = () => {
    if (!processedImage || !originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const foregroundImg = new window.Image();
    foregroundImg.onload = () => {
      canvas.width = foregroundImg.width;
      canvas.height = foregroundImg.height;

      const triggerDownload = () => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        const fileExtension = originalImage?.file.name.split('.').pop() || 'png';
        link.download = `OptiPic_BG_${Date.now()}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      if (customBgImage) {
        const backgroundImg = new window.Image();
        backgroundImg.onload = () => {
            const canvasAspect = canvas.width / canvas.height;
            const bgAspect = backgroundImg.width / backgroundImg.height;
            let sx, sy, sWidth, sHeight;

            let base_sWidth = bgAspect > canvasAspect ? backgroundImg.height * canvasAspect : backgroundImg.width;
            let base_sHeight = bgAspect > canvasAspect ? backgroundImg.height : backgroundImg.width / canvasAspect;

            sWidth = base_sWidth / customBgImage.zoom;
            sHeight = base_sHeight / customBgImage.zoom;

            let base_sx = (backgroundImg.width - base_sWidth) / 2;
            let base_sy = (backgroundImg.height - base_sHeight) / 2;
            sx = base_sx + (base_sWidth - sWidth) / 2;
            sy = base_sy + (base_sHeight - sHeight) / 2;

            const container = imageDisplayRef.current;
            if (container) {
                const contAspect = container.clientWidth / container.clientHeight;
                let screenCoverW = bgAspect > contAspect ? container.clientHeight * bgAspect : container.clientWidth;
                const panScale = backgroundImg.width / (screenCoverW * customBgImage.zoom);
                sx -= customBgImage.pan.x * panScale;
                sy -= customBgImage.pan.y * panScale;
            }
            
            sx = Math.max(0, Math.min(backgroundImg.width - sWidth, sx));
            sy = Math.max(0, Math.min(backgroundImg.height - sHeight, sy));

            ctx.drawImage(backgroundImg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            ctx.drawImage(foregroundImg, 0, 0);
            triggerDownload();
        };
        backgroundImg.onerror = () => toast({ variant: "destructive", title: "Error", description: "Could not load custom background image." });
        backgroundImg.src = customBgImage.src;
      } else {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(foregroundImg, 0, 0);
        triggerDownload();
      }
    };
    foregroundImg.onerror = () => toast({ variant: "destructive", title: "Error", description: "Could not load processed image." });
    foregroundImg.crossOrigin = "anonymous";
    foregroundImg.src = processedImage;
  };
  
  const handleZoomChange = useCallback((newZoom: number) => {
    setCustomBgImage(bg => bg ? { ...bg, zoom: newZoom, pan: newZoom === 1 ? {x: 0, y: 0} : bg.pan } : null);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!customBgImage || customBgImage.zoom <= 1) return;
    setDragState({ type: 'pan', startX: e.clientX, startY: e.clientY, startPan: customBgImage.pan });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !customBgImage || !imageDisplayRef.current) return;
    
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    const container = imageDisplayRef.current;
    const { clientWidth: contW, clientHeight: contH } = container;
    const { width: W, height: H, zoom } = customBgImage;
    const imgAspectRatio = W / H;
    const contAspectRatio = contW / contH;
    
    let coveredW = imgAspectRatio > contAspectRatio ? contH * imgAspectRatio : contW;
    let coveredH = imgAspectRatio > contAspectRatio ? contH : contW / imgAspectRatio;

    const maxPanX = Math.max(0, (coveredW * zoom - contW) / 2);
    const maxPanY = Math.max(0, (coveredH * zoom - contH) / 2);

    const newPan = { x: dragState.startPan.x + dx, y: dragState.startPan.y + dy };
    const clampedPan = {
        x: Math.max(-maxPanX, Math.min(maxPanX, newPan.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newPan.y)),
    };
    setCustomBgImage(bg => bg ? { ...bg, pan: clampedPan } : null);

  }, [dragState, customBgImage]);

  const handleMouseUp = useCallback(() => setDragState(null), []);

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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!customBgImage) return;
    if (e.touches.length === 1) {
      if (customBgImage.zoom <= 1) return;
      setTouchState({ startX: e.touches[0].clientX, startY: e.touches[0].clientY, startPan: customBgImage.pan });
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setTouchState({ startDist: dist, startZoom: customBgImage.zoom });
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchState || !customBgImage || !imageDisplayRef.current) return;
    
    if (e.touches.length === 1 && touchState.startX !== undefined && touchState.startY !== undefined && touchState.startPan) {
      const dx = e.touches[0].clientX - touchState.startX;
      const dy = e.touches[0].clientY - touchState.startY;

      const container = imageDisplayRef.current;
      const { clientWidth: contW, clientHeight: contH } = container;
      const { width: W, height: H, zoom } = customBgImage;
      const imgAspectRatio = W / H;
      const contAspectRatio = contW / contH;
      
      let coveredW = imgAspectRatio > contAspectRatio ? contH * imgAspectRatio : contW;
      let coveredH = imgAspectRatio > contAspectRatio ? contH : contW / imgAspectRatio;
      
      const maxPanX = Math.max(0, (coveredW * zoom - contW) / 2);
      const maxPanY = Math.max(0, (coveredH * zoom - contH) / 2);
  
      const newPan = { x: touchState.startPan.x + dx, y: touchState.startPan.y + dy };
      const clampedPan = {
          x: Math.max(-maxPanX, Math.min(maxPanX, newPan.x)),
          y: Math.max(-maxPanY, Math.min(maxPanY, newPan.y)),
      };
      setCustomBgImage(bg => bg ? { ...bg, pan: clampedPan } : null);

    } else if (e.touches.length === 2 && touchState.startDist && touchState.startZoom) {
      e.preventDefault();
      const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const scale = newDist / touchState.startDist;
      const newZoom = Math.max(1, Math.min(5, touchState.startZoom * scale));
      handleZoomChange(newZoom);
    }
  }, [touchState, customBgImage, handleZoomChange]);

  const handleTouchEnd = useCallback(() => setTouchState(null), []);

  useEffect(() => {
    const el = imageDisplayRef.current;
    if (touchState && el) {
      el.addEventListener('touchmove', handleTouchMove, { passive: false });
      el.addEventListener('touchend', handleTouchEnd);
      el.addEventListener('touchcancel', handleTouchEnd);
    }
    return () => {
      if (el) {
        el.removeEventListener('touchmove', handleTouchMove);
        el.removeEventListener('touchend', handleTouchEnd);
        el.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, [touchState, handleTouchMove, handleTouchEnd]);

  if (!originalImage) {
    return (
      <div className="container py-12 px-4 md:px-6">
        <div
          className="relative flex flex-col items-center justify-center w-full min-h-[400px] lg:min-h-[500px] rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-card overflow-hidden transition-colors hover:border-primary/50 hover:bg-primary/5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } } as any); }}
        >
          {placeholderImage && <Image src={placeholderImage.imageUrl} alt="Abstract background" data-ai-hint={placeholderImage.imageHint} fill className="object-cover opacity-10 dark:opacity-5" />}
          <div 
            className="relative z-10 flex flex-col items-center justify-center p-8 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <UploadCloud className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-2 font-headline">Click or drag image to upload</h3>
            <p className="text-muted-foreground">The background will be removed automatically on your device.</p>
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
            <div 
              ref={imageDisplayRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className={cn(
                "relative w-full aspect-[4/3] flex items-center justify-center transition-colors bg-white",
                 customBgImage && customBgImage.zoom > 1 && "cursor-grab",
                 dragState && "cursor-grabbing"
              )}
            >
              {customBgImage ? (
                <Image
                  src={customBgImage.src}
                  alt="Custom background"
                  fill
                  className="object-cover transition-transform"
                  style={{
                    transform: `translate(${customBgImage.pan.x}px, ${customBgImage.pan.y}px) scale(${customBgImage.zoom})`,
                    touchAction: 'none'
                  }}
                  draggable={false}
                />
              ) : (
                <div className="absolute inset-0" style={{backgroundColor: bgColor}} />
              )}

              {isProcessing && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-20">
                      <Loader2 className="w-12 h-12 animate-spin text-primary" />
                      <p className="mt-4 text-lg font-medium text-muted-foreground">Removing background...</p>
                  </div>
              )}
              {processedImage && (
                <Image
                  src={processedImage}
                  alt="Processed image"
                  width={originalImage.width}
                  height={originalImage.height}
                  className="max-w-full max-h-full object-contain relative z-10 pointer-events-none"
                  draggable={false}
                />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </Card>
        </div>
        
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette size={20} /> Background</CardTitle>
                    <CardDescription>Pick a color or upload an image.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-6 gap-2">
                        {BG_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => { setBgColor(color); setCustomBgImage(null); }}
                                className={cn("w-full aspect-square rounded-md border-2", !customBgImage && bgColor === color ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent", customBgImage && "opacity-50 cursor-not-allowed")}
                                style={{ backgroundColor: color }}
                                title={color}
                                disabled={!!customBgImage}
                            />
                        ))}
                    </div>
                    <Separator className="my-4" />
                    <input ref={customBgFileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleCustomBgChange} />
                    {customBgImage ? (
                        <div className="space-y-4">
                            <div className="relative w-full aspect-video rounded-md overflow-hidden ring-1 ring-inset ring-border">
                                <Image src={customBgImage.src} alt="Custom background preview" fill className="object-cover"/>
                                <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5">
                                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => customBgFileInputRef.current?.click()}>
                                        <ImagePlus size={16} />
                                    </Button>
                                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setCustomBgImage(null)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Zoom</label>
                                <div className="flex items-center gap-2">
                                  <ZoomOut size={16} />
                                  <Slider value={[customBgImage.zoom]} onValueChange={(v) => handleZoomChange(v[0])} min={1} max={5} step={0.1} />
                                  <ZoomIn size={16} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Button variant="outline" className="w-full" onClick={() => customBgFileInputRef.current?.click()}>
                           <ImagePlus className="mr-2" /> Upload Custom Background
                        </Button>
                    )}
                </CardContent>
            </Card>
            
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Download size={20}/> Export</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button className="w-full" size="lg" onClick={handleDownload} disabled={isProcessing || !processedImage}>
                        {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Download className="mr-2"/>}
                        Download Image
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={resetState} disabled={isProcessing}>
                        <Trash2 className="mr-2"/>
                        Start Over
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
