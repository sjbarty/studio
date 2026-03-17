"use client";

import { useState, useRef, useCallback, type ChangeEvent, useEffect } from "react";
import Image from "next/image";
import { UploadCloud, Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Input } from "@/components/ui/input";
import { MemeTemplates, type MemeTemplate } from "@/lib/meme-templates";

const placeholderImage = PlaceHolderImages.find(p => p.id === 'editor-placeholder');

type TextDragState = {
  type: 'top' | 'bottom' | 'middle';
  startX: number;
  startY: number;
  startPos: { x: number; y: number };
};

const MemeTextDisplay = ({ text, position, onMouseDown, onTouchStart }: {
    text: string;
    position: { x: number; y: number; };
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
}) => (
    <div
      className="absolute text-white font-black z-10 text-center cursor-move select-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: 'clamp(1.2rem, 5vw, 2.5rem)',
        WebkitTextStroke: '1px black',
        textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 3px 3px 6px rgba(0,0,0,0.5)',
        touchAction: 'none',
        maxWidth: '90%',
        wordBreak: 'break-word',
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {text}
    </div>
);


export function MemeGenerator() {
  const [image, setImage] = useState<{ file: File; url: string; width: number; height: number; } | null>(null);
  const [topText, setTopText] = useState("Top Text");
  const [bottomText, setBottomText] = useState("Bottom Text");
  const [middleText, setMiddleText] = useState("Middle Text");

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const [topTextPos, setTopTextPos] = useState({ x: 50, y: 10 });
  const [bottomTextPos, setBottomTextPos] = useState({ x: 50, y: 90 });
  const [middleTextPos, setMiddleTextPos] = useState({ x: 50, y: 50 });
  const [dragState, setDragState] = useState<TextDragState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const resetState = useCallback((newUrl?: string) => {
    if (image?.url && image.url !== newUrl) {
      URL.revokeObjectURL(image.url);
    }
    setImage(null);
    setTopText("Top Text");
    setBottomText("Bottom Text");
    setMiddleText("");
    setTopTextPos({ x: 50, y: 10 });
    setBottomTextPos({ x: 50, y: 90 });
    setMiddleTextPos({ x: 50, y: 50 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [image?.url]);
  
  useEffect(() => {
    const url = image?.url;
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [image?.url]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      if(file) toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      return;
    }
    
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.onload = () => {
      resetState(url);
      setImage({ file, url, width: img.width, height: img.height });
    };
    img.onerror = () => {
        toast({ variant: "destructive", title: "Invalid Image", description: "Could not load the selected file." });
        URL.revokeObjectURL(url);
        resetState();
    }
    img.src = url;
  };

  const handleTemplateSelect = async (template: MemeTemplate) => {
    setIsProcessing(true);
    try {
        const response = await fetch(template.imageUrl);
        if (!response.ok) throw new Error('Network response was not ok.');
        const blob = await response.blob();
        const fileName = template.id + '.jpg';
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });

        const url = URL.createObjectURL(file);
        const img = document.createElement('img');
        img.onload = () => {
          resetState(url);
          setImage({ file, url, width: img.width, height: img.height });
          setIsProcessing(false);
        };
        img.onerror = () => {
            toast({ variant: "destructive", title: "Error", description: "Could not load template image." });
            URL.revokeObjectURL(url);
            resetState();
            setIsProcessing(false);
        }
        img.src = url;
    } catch (error) {
        console.error("Failed to load template", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load the selected template." });
        setIsProcessing(false);
    }
  };


  const handleTextMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: 'top' | 'bottom' | 'middle') => {
    e.preventDefault();
    e.stopPropagation();
    const startPos = type === 'top' ? topTextPos : type === 'bottom' ? bottomTextPos : middleTextPos;
    setDragState({ type, startX: e.clientX, startY: e.clientY, startPos });
  };
  
  const handleTextTouchStart = (e: React.TouchEvent<HTMLDivElement>, type: 'top' | 'bottom' | 'middle') => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const startPos = type === 'top' ? topTextPos : type === 'bottom' ? bottomTextPos : middleTextPos;
    setDragState({ type, startX: touch.clientX, startY: touch.clientY, startPos });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState || !imageContainerRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - dragState.startX;
    const dy = clientY - dragState.startY;

    const { width, height } = imageContainerRef.current.getBoundingClientRect();
    const newX = dragState.startPos.x + (dx / width) * 100;
    const newY = dragState.startPos.y + (dy / height) * 100;
    
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));

    if (dragState.type === 'top') {
      setTopTextPos({ x: clampedX, y: clampedY });
    } else if (dragState.type === 'bottom') {
      setBottomTextPos({ x: clampedX, y: clampedY });
    } else {
      setMiddleTextPos({ x: clampedX, y: clampedY });
    }
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      const handleMove = (e: MouseEvent) => handleMouseMove(e);
      const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); handleMouseMove(e); };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);


  const handleDownload = async () => {
    if (!image) return;
    setIsProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
        toast({ variant: "destructive", title: "Error", description: "Could not create meme." });
        setIsProcessing(false);
        return;
    }
    
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = image.url;
    
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(2, img.width / 200);
        ctx.font = `bold ${Math.max(20, img.width / 12)}px Impact, sans-serif`;

        // Draw top text
        const topX = (topTextPos.x / 100) * canvas.width;
        const topY = (topTextPos.y / 100) * canvas.height;
        ctx.strokeText(topText.toUpperCase(), topX, topY);
        ctx.fillText(topText.toUpperCase(), topX, topY);
        
        // Draw middle text
        const middleX = (middleTextPos.x / 100) * canvas.width;
        const middleY = (middleTextPos.y / 100) * canvas.height;
        ctx.strokeText(middleText.toUpperCase(), middleX, middleY);
        ctx.fillText(middleText.toUpperCase(), middleX, middleY);

        // Draw bottom text
        const bottomX = (bottomTextPos.x / 100) * canvas.width;
        const bottomY = (bottomTextPos.y / 100) * canvas.height;
        ctx.strokeText(bottomText.toUpperCase(), bottomX, bottomY);
        ctx.fillText(bottomText.toUpperCase(), bottomX, bottomY);

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `OptiPic_Meme_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsProcessing(false);
    };
    img.onerror = () => {
        toast({ variant: "destructive", title: "Error", description: "Could not load image to create meme." });
        setIsProcessing(false);
    }
  };

  if (!image) {
    return (
      <>
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
            <p className="text-muted-foreground">Add some text to make it a meme.</p>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
        </div>
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>Or use a popular template</CardTitle>
                <CardDescription>Click a template to get started.</CardDescription>
            </CardHeader>
            <CardContent>
                {isProcessing ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-4 text-muted-foreground">Loading template...</p>
                    </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {MemeTemplates.map(template => (
                          <button key={template.id} className="text-left group" onClick={() => handleTemplateSelect(template)}>
                              <div className="relative aspect-video w-full rounded-lg overflow-hidden ring-1 ring-border group-hover:ring-primary transition-all">
                                  <Image
                                      src={template.imageUrl}
                                      alt={template.name}
                                      fill
                                      className="object-cover"
                                      data-ai-hint={template.imageHint}
                                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                  />
                              </div>
                              <p className="text-sm text-center font-medium mt-2 text-muted-foreground group-hover:text-foreground transition-colors">{template.name}</p>
                          </button>
                      ))}
                  </div>
                )}
            </CardContent>
        </Card>
      </>
    );
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 xl:col-span-9">
        <Card className="overflow-hidden">
          <div ref={imageContainerRef} className="relative w-full aspect-[4/3] bg-muted/30 flex items-center justify-center">
            <Image
              src={image.url}
              alt="Meme background"
              width={image.width}
              height={image.height}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
            <MemeTextDisplay
              text={topText}
              position={topTextPos}
              onMouseDown={(e) => handleTextMouseDown(e, 'top')}
              onTouchStart={(e) => handleTextTouchStart(e, 'top')}
            />
            <MemeTextDisplay
              text={middleText}
              position={middleTextPos}
              onMouseDown={(e) => handleTextMouseDown(e, 'middle')}
              onTouchStart={(e) => handleTextTouchStart(e, 'middle')}
            />
            <MemeTextDisplay
              text={bottomText}
              position={bottomTextPos}
              onMouseDown={(e) => handleTextMouseDown(e, 'bottom')}
              onTouchStart={(e) => handleTextTouchStart(e, 'bottom')}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </Card>
      </div>
      <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">Add Text</CardTitle>
                  <CardDescription>Enter text and drag it on the image.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-1">
                      <label htmlFor="top-text" className="text-sm font-medium">Top Text</label>
                      <Input id="top-text" placeholder="Top text" value={topText} onChange={e => setTopText(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                       <label htmlFor="middle-text" className="text-sm font-medium">Middle Text</label>
                      <Input id="middle-text" placeholder="Middle text" value={middleText} onChange={e => setMiddleText(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                       <label htmlFor="bottom-text" className="text-sm font-medium">Bottom Text</label>
                      <Input id="bottom-text" placeholder="Bottom text" value={bottomText} onChange={e => setBottomText(e.target.value)} />
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Download size={20}/> Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                  <Button className="w-full" size="lg" onClick={handleDownload} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Download className="mr-2"/>}
                      Download Meme
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => resetState()}>
                      <Trash2 className="mr-2"/>
                      Start Over
                  </Button>
              </CardContent>
          </Card>
      </div>
    </div>
  )
}
