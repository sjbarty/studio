"use client";

import { useState, useRef, type ChangeEvent } from "react";
import Image from "next/image";
import { Download, UploadCloud, LayoutGrid, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

export function CollageMaker() {
  const [layout, setLayout] = useState(4);
  const [images, setImages] = useState<(string | null)[]>(Array(4).fill(null));
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

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
        setImages(currentImages => {
            const newImages = [...currentImages];
            newImages[activeSlot] = url;
            return newImages;
        });
        setActiveSlot(null);
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
                
                const imgAspectRatio = img.width / img.height;
                const passportAspectRatio = 1; // square
                
                let sx, sy, sWidth, sHeight;

                if (imgAspectRatio > passportAspectRatio) {
                    sHeight = img.height;
                    sWidth = sHeight * passportAspectRatio;
                    sx = (img.width - sWidth) / 2;
                    sy = 0;
                } else {
                    sWidth = img.width;
                    sHeight = sWidth / passportAspectRatio;
                    sy = (img.height - sHeight) / 2;
                    sx = 0;
                }

                ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, PASSPORT_PRINT_PX, PASSPORT_PRINT_PX);
                resolve();
            };
            img.onerror = reject;
            img.src = imgData;
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
                            onClick={() => handleSlotClick(index)}
                            className={cn(
                                "relative bg-muted/30 rounded-md flex items-center justify-center border-2 border-dashed border-muted-foreground/20 cursor-pointer hover:border-primary transition-colors overflow-hidden",
                                imgSrc && "border-solid border-transparent"
                            )}
                            style={{aspectRatio: '1/1'}}
                        >
                            {imgSrc ? (
                                <>
                                    <Image src={imgSrc} alt={`Collage image ${index + 1}`} fill style={{objectFit: 'cover'}} className="rounded-md" />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-7 w-7 opacity-50 hover:opacity-100 z-10"
                                        onClick={(e) => removeImage(index, e)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
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
                <CardContent>
                     <Button className="w-full" size="lg" onClick={handleDownload} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Download className="mr-2"/>}
                        {isProcessing ? 'Processing...' : 'Download Collage'}
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
