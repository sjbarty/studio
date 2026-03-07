"use client";

import { useState, useRef, type ChangeEvent, useCallback, useEffect } from "react";
import Image from "next/image";
import { Download, UploadCloud, LayoutGrid, Trash2, Loader2, ZoomIn, ZoomOut, Printer, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PASSPORT_PRINT_PX = 602; // 51mm at 300 DPI

const LAYOUTS = [2, 3, 4, 5, 6];

const getGridLayout = (layout: number) => {
  switch (layout) {
    case 2: return { cols: 2, rows: 1, gridClass: "grid-cols-2 grid-rows-1" };
    case 3: return { cols: 3, rows: 1, gridClass: "grid-cols-3 grid-rows-1" };
    case 4: return { cols: 2, rows: 2, gridClass: "grid-cols-2 grid-rows-2" };
    case 5: return { cols: 3, rows: 2, gridClass: "grid-cols-3 grid-rows-2" };
    case 6: return { cols: 3, rows: 2, gridClass: "grid-cols-3 grid-rows-2" };
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

  const handleDownload = async () => {
    setIsProcessing(true);

    const filledSlots = images.filter(img => img !== null).length;
    if (filledSlots === 0) {
      toast({ variant: "destructive", title: "Empty Collage", description: "Please add at least one image." });
      setIsProcessing(false);
      return;
    }

    const { cols, rows } = getGridLayout(layout);
    const canvas = document.createElement('canvas');
    canvas.width = cols * PASSPORT_PRINT_PX;
    canvas.height = rows * PASSPORT_PRINT_PX;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        toast({ variant: "destructive", title: "Error", description: "Could not create collage." });
        setIsProcessing(false);
        return;
    }

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imagePromises = images.map((imgData, index) => {
        if (!imgData) return Promise.resolve();

        return new Promise<void>((resolve, reject) => {
            const img = document.createElement('img');
            img.onload = () => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = col * PASSPORT_PRINT_PX;
                const y = row * PASSPORT_PRINT_PX;
                
                const { width: W, height: H, zoom, pan } = imgData;
                const assumedContainerWidth = PASSPORT_PRINT_PX;

                const imgAr = W / H;

                let coveredW;
                if (imgAr > 1) { // landscape
                    coveredW = assumedContainerWidth * imgAr;
                } else { // portrait or square
                    coveredW = assumedContainerWidth;
                }
                
                const sourceToScreenScale = coveredW / W;
                const panInSourceCoords = { x: pan.x / sourceToScreenScale, y: pan.y / sourceToScreenScale };
                const cropDim = Math.min(W, H) / zoom;
                const centerPoint = { x: W / 2 - panInSourceCoords.x, y: H / 2 - panInSourceCoords.y };
                
                let sx = centerPoint.x - cropDim / 2;
                let sy = centerPoint.y - cropDim / 2;

                sx = Math.max(0, Math.min(W - cropDim, sx));
                sy = Math.max(0, Math.min(H - cropDim, sy));

                ctx.drawImage(img, sx, sy, cropDim, cropDim, x, y, PASSPORT_PRINT_PX, PASSPORT_PRINT_PX);
                resolve();
            };
            img.onerror = reject;
            img.src = imgData.src;
        });
    });

    try {
      await Promise.all(imagePromises);
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Could not load one of the images." });
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

    const { cols, rows } = getGridLayout(layout);
    const canvas = document.createElement('canvas');
    canvas.width = cols * PASSPORT_PRINT_PX;
    canvas.height = rows * PASSPORT_PRINT_PX;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        toast({ variant: "destructive", title: "Error", description: "Could not create collage for printing." });
        setIsPrinting(false);
        return;
    }

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imagePromises = images.map((imgData, index) => {
        if (!imgData) return Promise.resolve();

        return new Promise<void>((resolve, reject) => {
            const img = document.createElement('img');
            img.onload = () => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                const x = col * PASSPORT_PRINT_PX;
                const y = row * PASSPORT_PRINT_PX;
                
                const { width: W, height: H, zoom, pan } = imgData;
                const assumedContainerWidth = PASSPORT_PRINT_PX;

                const imgAr = W / H;

                let coveredW;
                if (imgAr > 1) { // landscape
                    coveredW = assumedContainerWidth * imgAr;
                } else { // portrait or square
                    coveredW = assumedContainerWidth;
                }
                
                const sourceToScreenScale = coveredW / W;
                const panInSourceCoords = { x: pan.x / sourceToScreenScale, y: pan.y / sourceToScreenScale };
                const cropDim = Math.min(W, H) / zoom;
                const centerPoint = { x: W / 2 - panInSourceCoords.x, y: H / 2 - panInSourceCoords.y };
                
                let sx = centerPoint.x - cropDim / 2;
                let sy = centerPoint.y - cropDim / 2;

                sx = Math.max(0, Math.min(W - cropDim, sx));
                sy = Math.max(0, Math.min(H - cropDim, sy));

                ctx.drawImage(img, sx, sy, cropDim, cropDim, x, y, PASSPORT_PRINT_PX, PASSPORT_PRINT_PX);
                resolve();
            };
            img.onerror = reject;
            img.src = imgData.src;
        });
    });

    try {
      await Promise.all(imagePromises);
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: "Could not load one of the images for printing." });
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
                className="w-full bg-white p-4 rounded-lg shadow-inner border"
                style={{ aspectRatio: `${cols}/${rows}`}}
            >
                <div className={cn("grid gap-2 h-full w-full", gridClass)}>
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
                                "relative bg-muted/30 rounded-md flex items-center justify-center border-2 border-dashed border-muted-foreground/20 overflow-hidden",
                                imgSrc && "border-solid border-transparent",
                                imgSrc && imgSrc.zoom > 1 && "cursor-grab",
                                dragState && dragState.index === index && "cursor-grabbing"
                            )}
                            style={{aspectRatio: '1/1'}}
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
                                      className="rounded-md"
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
                    <RadioGroup value={String(layout)} onValueChange={handleLayoutChange} className="grid grid-cols-3 gap-2">
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
