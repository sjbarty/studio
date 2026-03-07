"use client";

import { useState, useRef, useCallback, type ChangeEvent, useEffect } from "react";
import Image from "next/image";
import { UploadCloud, Download, Loader2, Palette, Trash2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { removeBackground } from "@imgly/background-removal";
import { Separator } from "@/components/ui/separator";

const placeholderImage = PlaceHolderImages.find(p => p.id === 'editor-placeholder');

const BG_COLORS = [
  "#FFFFFF", "#E2E8F0", "#FECACA", "#FED7AA", "#FEF08A", "#D9F99D", "#A7F3D0", "#A5F3FC", "#BFDBFE", "#C7D2FE", "#FBCFE8"
];

export function BackgroundChanger() {
  const [originalImage, setOriginalImage] = useState<{ file: File; width: number; height: number; } | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>("#FFFFFF");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customBgImage, setCustomBgImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const customBgFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    // Revoke the object URL on component unmount
    return () => {
      if (processedImage) {
        URL.revokeObjectURL(processedImage);
      }
    };
  }, [processedImage]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      if(file) {
        toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      }
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.onload = () => {
      resetState();
      setOriginalImage({ file, width: img.width, height: img.height });
      URL.revokeObjectURL(tempUrl); // Clean up temp URL
      
      setIsProcessing(true);
      removeBackground(file)
        .then((blob: Blob) => {
          const processedUrl = URL.createObjectURL(blob);
          setProcessedImage(processedUrl);
        })
        .catch((error) => {
          console.error(error);
          toast({
            variant: "destructive",
            title: "Background Removal Failed",
            description: "Could not process the image. Please try another one.",
          });
          resetState();
        })
        .finally(() => {
          setIsProcessing(false);
        });
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
      if (file) {
        toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      }
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        setCustomBgImage(loadEvent.target?.result as string);
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
            ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
            ctx.drawImage(foregroundImg, 0, 0);
            triggerDownload();
        };
        backgroundImg.onerror = () => {
             toast({ variant: "destructive", title: "Error", description: "Could not load custom background image." });
        }
        backgroundImg.src = customBgImage;
      } else {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(foregroundImg, 0, 0);
        triggerDownload();
      }
    };
    foregroundImg.onerror = () => {
        toast({ variant: "destructive", title: "Error", description: "Could not load processed image." });
    }
    foregroundImg.crossOrigin = "anonymous";
    foregroundImg.src = processedImage;
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
              className="relative w-full aspect-[4/3] flex items-center justify-center transition-colors bg-cover bg-center"
              style={{ 
                backgroundColor: customBgImage ? 'transparent' : bgColor,
                backgroundImage: customBgImage ? `url(${customBgImage})` : 'none',
               }}
            >
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
                  className="max-w-full max-h-full object-contain"
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
                        <div className="space-y-3">
                            <div className="relative w-full aspect-video rounded-md overflow-hidden ring-1 ring-inset ring-border">
                                <Image src={customBgImage} alt="Custom background preview" fill className="object-cover"/>
                                <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5">
                                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => customBgFileInputRef.current?.click()}>
                                        <ImagePlus size={16} />
                                    </Button>
                                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => setCustomBgImage(null)}>
                                        <Trash2 size={16} />
                                    </Button>
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
