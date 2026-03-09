
"use client";

import { useState, useRef, type ChangeEvent, useCallback, useEffect } from "react";
import Image from "next/image";
import { Download, UploadCloud, LayoutGrid, Trash2, Loader2, ZoomIn, ZoomOut, Printer, Copy, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PASSPORT_PRINT_PX = 602; // 51mm at 300 DPI

const LAYOUTS = [1, 2, 3, 4, 5, 6, 8, 9];

const BG_COLORS = [
  "#FFFFFF", "#000000", "#E2E8F0", "#FECACA", "#FED7AA", "#FEF08A", "#D9F99D", "#A7F3D0", "#A5F3FC", "#BFDBFE", "#C7D2FE", "#FBCFE8"
];

const getGridLayout = (layout: number) => {
  switch (layout) {
    case 1: return { cols: 1, rows: 1, gridClass: "grid-cols-1 grid-rows-1" };
    case 2: return { cols: 2, rows: 1, gridClass: "grid-cols-2 grid-rows-1" };
    case 3: return { cols: 3, rows: 1, gridClass: "grid-cols-3 grid-rows-1" };
    case 4: return { cols: 2, rows: 2, gridClass: "grid-cols-2 grid-rows-2" };
    case 5: return { cols: 3, rows: 2, gridClass: "grid-cols-3 grid-rows-2" };
    case 6: return { cols: 3, rows: 2, gridClass: "grid-cols-3 grid-rows-2" };
    case 8: return { cols: 4, rows: 2, gridClass: "grid-cols-4 grid-rows-2" };
    case 9: return { cols: 3, rows: 3, gridClass: "grid-cols-3 grid-rows-3" };
    default: return { cols: 2, rows: 1, gridClass: "grid-cols-2 grid-rows-1" };
  }
};

interface CollageImage {
  src: string;
  width: number;
  height: number;
  zoom: number;
  pan: { x: number; y: number };
}

type DragState = { index: number; startX: number; startY: number; startPan: { x: number, y: number } } | null;
type TouchState = {
    index: number;
    startPan?: { x: number; y: number };
    startZoom?: number;
    startDist?: number;
    startX?: number;
    startY?: number;
  } | null;

export function CollageMaker() {
  const [layout, setLayout] = useState(4);
  const [images, setImages] = useState<(CollageImage | null)[]>(Array(4).fill(null));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [touchState, setTouchState] = useState<TouchState | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  
  const [gap, setGap] = useState(8);
  const [cornerRadius, setCornerRadius] = useState(8);
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");

  const handleLayoutChange = (newLayoutStr: string) => {
    const newLayout = parseInt(newLayoutStr, 10);
    setLayout(newLayout);
    setImages(currentImages => {
        const newImages = Array(newLayout).fill(null);
        for (let i = 0; i < Math.min(currentImages.length, newLayout); i++) {
            newImages[i] = currentImages[i];
        }
        return newImages;
    });
  };

  const handleSlotClick = (index: number) => {
      if (images[index]) return;
      setActiveSlot(index);
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (activeSlot === null) return;
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!file || !file.type.startsWith("image/")) {
        if (file) {
            toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
        }
        setActiveSlot(null);
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        const url = loadEvent.target?.result as string;
        const img = document.createElement('img');
        img.onload = () => {
            setImages(currentImages => {
                const newImages = [...currentImages];
                newImages[activeSlot] = {
                    src: url,
                    width: img.width,
                    height: img.height,
                    zoom: 1,
                    pan: { x: 0, y: 0 }
                };
                return newImages;
            });
            setActiveSlot(null);
        }
        img.src = url;
    };
    reader.readAsDataURL(file);
  };
  
  const removeImage = (index: number, e: React.MouseEvent) => {
      e.stopPropagation();
      setImages(currentImages => {
          const newImages = [...currentImages];
          newImages[index] = null;
          return newImages;
      })
  }

  const handleDuplicate = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const imageToDuplicate = images[index];
    if (!imageToDuplicate) return;

    setLayout(6);
    setImages(Array(6).fill(null).map(() => ({
      ...imageToDuplicate,
      pan: { x: 0, y: 0 },
      zoom: 1,
    })));
    
    toast({
      title: "Image Duplicated",
      description: "Layout set to 6 and image applied to all slots.",
    });
  };

  const handleZoomChange = useCallback((index: number, newZoom: number) => {
      setImages(currentImages => {
          const newImages = [...currentImages];
          const img = newImages[index];
          if (img) {
              newImages[index] = { ...img, zoom: newZoom, pan: newZoom === 1 ? {x: 0, y: 0} : img.pan };
          }
          return newImages;
      })
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const imageState = images[index];
    if (!imageState || imageState.zoom <= 1) return;
    setDragState({ index, startX: e.clientX, startY: e.clientY, startPan: imageState.pan });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !slotRef.current) return;
    
    const imageState = images[dragState.index];
    if (!imageState) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    const containerSize = slotRef.current.getBoundingClientRect().width;
    const { width: W, height: H, zoom } = imageState;
    const imgAspectRatio = W / H;
    
    let coveredW, coveredH;
    if (imgAspectRatio > 1) { // landscape
        coveredH = containerSize;
        coveredW = containerSize * imgAspectRatio;
    } else { // portrait or square
        coveredW = containerSize;
        coveredH = containerSize / imgAspectRatio;
    }

    const maxPanX = Math.max(0, (coveredW * zoom - containerSize) / 2);
    const maxPanY = Math.max(0, (coveredH * zoom - containerSize) / 2);

    const newPan = {
        x: dragState.startPan.x + dx,
        y: dragState.startPan.y + dy,
    };
    
    const clampedPan = {
        x: Math.max(-maxPanX, Math.min(maxPanX, newPan.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newPan.y)),
    };

    setImages(currentImages => {
        const newImages = [...currentImages];
        const img = newImages[dragState.index];
        if (img) {
            newImages[dragState.index] = { ...img, pan: clampedPan };
        }
        return newImages;
    })

  }, [dragState, images]);

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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, index: number) => {
    const imageState = images[index];
    if (!imageState) return;
  
    if (e.touches.length === 1) {
      if (imageState.zoom <= 1) return;
      setTouchState({
        index,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startPan: imageState.pan,
      });
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchState({
        index,
        startDist: dist,
        startZoom: imageState.zoom,
      });
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchState || !slotRef.current) return;
  
    const imageState = images[touchState.index];
    if (!imageState) return;
    
    if (e.touches.length === 1 && touchState.startX !== undefined && touchState.startY !== undefined && touchState.startPan) {
      const dx = e.touches[0].clientX - touchState.startX;
      const dy = e.touches[0].clientY - touchState.startY;
  
      const containerSize = slotRef.current.getBoundingClientRect().width;
      const { width: W, height: H, zoom } = imageState;
      const imgAspectRatio = W / H;
      
      let coveredW, coveredH;
      if (imgAspectRatio > 1) {
          coveredH = containerSize;
          coveredW = containerSize * imgAspectRatio;
      } else {
          coveredW = containerSize;
          coveredH = containerSize / imgAspectRatio;
      }
  
      const maxPanX = Math.max(0, (coveredW * zoom - containerSize) / 2);
      const maxPanY = Math.max(0, (coveredH * zoom - containerSize) / 2);
  
      const newPan = {
          x: touchState.startPan.x + dx,
          y: touchState.startPan.y + dy,
      };
      
      const clampedPan = {
          x: Math.max(-maxPanX, Math.min(maxPanX, newPan.x)),
          y: Math.max(-maxPanY, Math.min(maxPanY, newPan.y)),
      };
  
      setImages(currentImages => {
          const newImages = [...currentImages];
          const img = newImages[touchState.index];
          if (img) {
              newImages[touchState.index] = { ...img, pan: clampedPan };
          }
          return newImages;
      });
    } else if (e.touches.length === 2 && touchState.startDist && touchState.startZoom) {
      e.preventDefault();
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = newDist / touchState.startDist;
      const newZoom = Math.max(1, Math.min(3, touchState.startZoom * scale));
      
      handleZoomChange(touchState.index, newZoom);
    }
  }, [touchState, images, handleZoomChange]);

  const handleTouchEnd = useCallback(() => {
    setTouchState(null);
  }, []);

  useEffect(() => {
    if (touchState) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('touchcancel', handleTouchEnd);
    }
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [touchState, handleTouchMove, handleTouchEnd]);

  const generateCollageCanvas = useCallback(async () => {
    const { cols, rows } = getGridLayout(layout);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;

    const scale = 4; // Scale for better resolution
    const canvasGap = gap * scale;
    const canvasCornerRadius = cornerRadius * scale;
    const cellWidth = PASSPORT_PRINT_PX;
    const cellHeight = PASSPORT_PRINT_PX;

    canvas.width = cols * cellWidth + (cols + 1) * canvasGap;
    canvas.height = rows * cellHeight + (rows + 1) * canvasGap;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
      if (radius === 0) {
        ctx.rect(x, y, width, height);
        return;
      }
      if (width < 2 * radius) radius = width / 2;
      if (height < 2 * radius) radius = height / 2;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + width, y, x + width, y + height, radius);
      ctx.arcTo(x + width, y + height, x, y + height, radius);
      ctx.arcTo(x, y + height, x, y, radius);
      ctx.arcTo(x, y, x + width, y, radius);
      ctx.closePath();
    }

    const imagePromises = images.map((imgData, index) => {
        if (!imgData) return Promise.resolve();

        return new Promise<void>((resolve, reject) => {
            const img = document.createElement('img');
            img.onload = () => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = col * (cellWidth + canvasGap) + canvasGap;
                const y = row * (cellHeight + canvasGap) + canvasGap;
                
                const { width: W, height: H, zoom, pan } = imgData;
                const imgAr = W / H;
                
                let coveredW = imgAr > 1 ? cellWidth * imgAr : cellWidth;
                
                const sourceToScreenScale = coveredW / W;
                const panInSourceCoords = { x: pan.x / sourceToScreenScale, y: pan.y / sourceToScreenScale };
                const cropDim = Math.min(W, H) / zoom;
                const centerPoint = { x: W / 2 - panInSourceCoords.x, y: H / 2 - panInSourceCoords.y };
                
                let sx = centerPoint.x - cropDim / 2;
                let sy = centerPoint.y - cropDim / 2;

                sx = Math.max(0, Math.min(W - cropDim, sx));
                sy = Math.max(0, Math.min(H - cropDim, sy));

                ctx.save();
                roundRect(ctx, x, y, cellWidth, cellHeight, canvasCornerRadius);
                ctx.clip();
                ctx.drawImage(img, sx, sy, cropDim, cropDim, x, y, cellWidth, cellHeight);
                ctx.restore();
                resolve();
            };
            img.onerror = reject;
            img.src = imgData.src;
        });
    });

    try {
      await Promise.all(imagePromises);
      return canvas;
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not load one of the images." });
      return null;
    }
  }, [images, layout, gap, cornerRadius, backgroundColor, toast]);

  const handleDownload = async () => {
    setIsProcessing(true);

    const filledSlots = images.filter(img => img !== null).length;
    if (filledSlots === 0) {
      toast({ variant: "destructive", title: "Empty Collage", description: "Please add at least one image." });
      setIsProcessing(false);
      return;
    }
    
    const canvas = await generateCollageCanvas();
    if (!canvas) {
      setIsProcessing(false);
      return;
    }
    
    canvas.toBlob(blob => {
        if (blob) {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `OptiPic_Collage_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } else {
             toast({ variant: "destructive", title: "Error", description: "Could not generate collage file." });
        }
        setIsProcessing(false);
    }, 'image/png');
  };

  const handlePrint = async () => {
    setIsPrinting(true);

    const filledSlots = images.filter(img => img !== null).length;
    if (filledSlots === 0) {
      toast({ variant: "destructive", title: "Empty Collage", description: "Please add at least one image to print." });
      setIsPrinting(false);
      return;
    }

    const canvas = await generateCollageCanvas();
    if (!canvas) {
        setIsPrinting(false);
        return;
    }
    
    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`<html><head><title>Print Collage</title></head><body style="margin:0;"><img src="${dataUrl}" style="width:100%;"></body></html>`);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    } else {
        toast({ variant: "destructive", title: "Popup Blocked", description: "Please allow popups for this site to print." });
    }

    setIsPrinting(false);
  }

  const { gridClass, cols, rows } = getGridLayout(layout);
  const totalSlots = cols * rows;

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 xl:col-span-9">
            <div 
                className="w-full rounded-lg shadow-inner border"
                style={{
                  aspectRatio: `${cols}/${rows}`,
                  backgroundColor: backgroundColor,
                  padding: `${gap}px`
                }}
            >
                <div className={cn("grid h-full w-full", gridClass)} style={{gap: `${gap}px`}}>
                    {Array.from({ length: totalSlots }).map((_, index) => {
                         if (layout === 5 && index >= 5) return null;

                        const imgSrc = images[index];

                        return (
                        <div
                            key={index}
                            ref={index === 0 ? slotRef : null}
                            onClick={() => handleSlotClick(index)}
                            onMouseDown={(e) => handleMouseDown(e, index)}
                            onTouchStart={(e) => handleTouchStart(e, index)}
                            className={cn(
                                "relative bg-muted/30 flex items-center justify-center border-2 border-dashed border-muted-foreground/20 overflow-hidden",
                                imgSrc && "border-solid border-transparent",
                                imgSrc && imgSrc.zoom > 1 && "cursor-grab",
                                dragState && dragState.index === index && "cursor-grabbing"
                            )}
                            style={{aspectRatio: '1/1', borderRadius: `${cornerRadius}px`}}
                        >
                            {imgSrc ? (
                                <>
                                    <Image 
                                      src={imgSrc.src} 
                                      alt={`Collage image ${index + 1}`} 
                                      fill 
                                      style={{
                                        objectFit: 'cover', 
                                        transform: `translate(${imgSrc.pan.x}px, ${imgSrc.pan.y}px) scale(${imgSrc.zoom})`,
                                        transition: dragState ? 'none' : 'transform 0.1s ease-out',
                                        touchAction: 'none',
                                      }}
                                      draggable={false}
                                    />
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="absolute top-2 right-11 h-7 w-7 opacity-50 hover:opacity-100 z-10"
                                        onClick={(e) => handleDuplicate(index, e)}
                                        title="Duplicate to all 6 slots"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 opacity-50 hover:opacity-100 z-10"
                                        onClick={(e) => removeImage(index, e)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <div 
                                      className="absolute bottom-0 left-0 right-0 p-2 z-10 bg-black/40 backdrop-blur-sm"
                                      onMouseDown={(e) => e.stopPropagation()}
                                      onTouchStart={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex items-center gap-2">
                                            <ZoomOut className="text-white" size={16}/>
                                            <Slider 
                                                value={[imgSrc.zoom]}
                                                onValueChange={(val) => handleZoomChange(index, val[0])}
                                                min={1}
                                                max={3}
                                                step={0.1}
                                            />
                                            <ZoomIn className="text-white" size={16}/>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground cursor-pointer hover:border-primary transition-colors">
                                    <UploadCloud className="w-8 h-8" />
                                    <span className="text-xs">Add Image</span>
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>
             <input ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
        </div>
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LayoutGrid size={20} /> Layout</CardTitle>
                    <CardDescription>Select the number of photos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={String(layout)} onValueChange={handleLayoutChange} className="grid grid-cols-4 gap-2">
                        {LAYOUTS.map(l => (
                            <div key={l}>
                                <RadioGroupItem value={String(l)} id={`layout-${l}`} className="sr-only" />
                                <Label htmlFor={`layout-${l}`} className={cn("flex h-14 w-full flex-col items-center justify-center rounded-md border-2 border-muted bg-popover hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    layout === l && "border-primary"
                                )}>
                                    <span className="text-xl font-bold">{l}</span>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette size={20}/> Style</CardTitle>
                    <CardDescription>Customize your collage.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label>Spacing</Label>
                        <Slider value={[gap]} onValueChange={(v) => setGap(v[0])} max={32} step={1} />
                    </div>
                    <div className="space-y-2">
                        <Label>Roundness</Label>
                        <Slider value={[cornerRadius]} onValueChange={(v) => setCornerRadius(v[0])} max={48} step={1} />
                    </div>
                     <div className="space-y-2">
                        <Label>Background</Label>
                        <div className="grid grid-cols-6 gap-2 pt-2">
                            {BG_COLORS.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setBackgroundColor(color)}
                                    className={cn("w-full aspect-square rounded-md border-2", backgroundColor === color ? "border-primary ring-2 ring-primary ring-offset-2" : "border-slate-200")}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Download size={20}/> Export</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                     <Button className="w-full" size="lg" onClick={handleDownload} disabled={isProcessing || isPrinting}>
                        {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Download className="mr-2"/>}
                        {isProcessing ? 'Processing...' : 'Save'}
                    </Button>
                    <Button variant="outline" className="w-full" size="lg" onClick={handlePrint} disabled={isProcessing || isPrinting}>
                        {isPrinting ? <Loader2 className="animate-spin mr-2"/> : <Printer className="mr-2"/>}
                        {isPrinting ? 'Printing...' : 'Print'}
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
