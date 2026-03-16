"use client";

import { useState, useRef, ChangeEvent, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, UploadCloud, Download, Loader2, Trash2, PenSquare } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

const placeholderImage = PlaceHolderImages.find(p => p.id === 'editor-placeholder');

interface Document {
  file: File;
  url: string;
  width: number;
  height: number;
}

interface Signature {
  url: string;
  width: number;
  height: number;
}

interface SignatureState {
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
}

type DragState = { type: 'move' | 'resize'; startX: number; startY: number; startState: SignatureState } | null;

export default function SignPage() {
  const [document, setDocument] = useState<Document | null>(null);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [signatureState, setSignatureState] = useState<SignatureState>({ x: 50, y: 50, width: 20 });
  const [dragState, setDragState] = useState<DragState>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const docFileInputRef = useRef<HTMLInputElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const resetState = useCallback(() => {
    if (document?.url) URL.revokeObjectURL(document.url);
    if (signature?.url) URL.revokeObjectURL(signature.url);
    setDocument(null);
    setSignature(null);
    setSignatureState({ x: 50, y: 50, width: 20 });
    if (docFileInputRef.current) docFileInputRef.current.value = "";
    if (sigFileInputRef.current) sigFileInputRef.current.value = "";
  }, [document?.url, signature?.url]);

  useEffect(() => {
    const docUrl = document?.url;
    const sigUrl = signature?.url;
    return () => {
      if (docUrl) URL.revokeObjectURL(docUrl);
      if (sigUrl) URL.revokeObjectURL(sigUrl);
    }
  }, [document?.url, signature?.url]);

  const handleDocChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      if (file) toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resetState();
      setDocument({ file, url, width: img.width, height: img.height });
    };
    img.onerror = () => {
      toast({ variant: "destructive", title: "Invalid Image", description: "Could not load the selected file." });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  
  const handleSigChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      if (file) toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file." });
      return;
    }
    
    // For best results, recommend a transparent background
    if (file.type !== 'image/png') {
        toast({
            title: "For best results",
            description: "Consider using a PNG signature with a transparent background."
        })
    }

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      if (signature?.url) URL.revokeObjectURL(signature.url);
      setSignature({ url, width: img.width, height: img.height });
    };
    img.onerror = () => {
      toast({ variant: "destructive", title: "Invalid Image", description: "Could not load signature file." });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, type: DragState['type']) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ type, startX: e.clientX, startY: e.clientY, startState: { ...signatureState } });
  };
  
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, type: DragState['type']) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    setDragState({ type, startX: touch.clientX, startY: touch.clientY, startState: { ...signatureState } });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState || !imageContainerRef.current) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - dragState.startX;
    const dy = clientY - dragState.startY;

    const { width: containerWidth, height: containerHeight } = imageContainerRef.current.getBoundingClientRect();
    
    let newState = { ...signatureState };
    
    if (dragState.type === 'move') {
      const newX = dragState.startState.x + (dx / containerWidth) * 100;
      const newY = dragState.startState.y + (dy / containerHeight) * 100;
      newState.x = Math.max(0, Math.min(100, newX));
      newState.y = Math.max(0, Math.min(100, newY));
    } else if (dragState.type === 'resize') {
      const newWidth = dragState.startState.width + (dx / containerWidth) * 100;
      newState.width = Math.max(5, Math.min(100, newWidth));
    }
    setSignatureState(newState);

  }, [dragState, signatureState]);

  const handleMouseUp = useCallback(() => setDragState(null), []);

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
    if (!document || !signature) return;
    setIsProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
        toast({ variant: "destructive", title: "Error", description: "Could not create final image." });
        setIsProcessing(false);
        return;
    }
    
    const docImg = new window.Image();
    docImg.crossOrigin = "anonymous";
    docImg.src = document.url;

    await new Promise(r => docImg.onload = r);
    
    canvas.width = docImg.width;
    canvas.height = docImg.height;
    ctx.drawImage(docImg, 0, 0);
    
    const sigImg = new window.Image();
    sigImg.crossOrigin = "anonymous";
    sigImg.src = signature.url;

    await new Promise(r => sigImg.onload = r);

    const sigWidthPx = (signatureState.width / 100) * canvas.width;
    const sigHeightPx = sigWidthPx * (signature.height / signature.width);
    const sigXPx = (signatureState.x / 100) * canvas.width - sigWidthPx / 2;
    const sigYPx = (signatureState.y / 100) * canvas.height - sigHeightPx / 2;

    ctx.drawImage(sigImg, sigXPx, sigYPx, sigWidthPx, sigHeightPx);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `OptiPic_Signed_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsProcessing(false);
  };
  
  const signatureAspectRatio = signature ? signature.height / signature.width : 1;
  const signatureDisplayWidth = signatureState.width + '%';
  const signatureDisplayHeight = `calc(${signatureState.width}% * ${signatureAspectRatio})`;

  if (!document) {
    return (
        <div className="container flex flex-col items-center justify-start min-h-screen py-8">
            <div className="w-full max-w-4xl">
                 <div className="flex items-center mb-6">
                    <Link href="/" passHref>
                        <Button variant="outline" size="icon" className="mr-4">
                        <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold font-headline">Image Signer</h1>
                </div>
                <div
                className="relative flex flex-col items-center justify-center w-full min-h-[400px] lg:min-h-[500px] rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-card overflow-hidden transition-colors hover:border-primary/50 hover:bg-primary/5"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleDocChange({ target: { files: e.dataTransfer.files } } as any); }}
                >
                {placeholderImage && <Image src={placeholderImage.imageUrl} alt="Abstract background" data-ai-hint={placeholderImage.imageHint} fill className="object-cover opacity-10 dark:opacity-5" />}
                <div 
                    className="relative z-10 flex flex-col items-center justify-center p-8 text-center cursor-pointer"
                    onClick={() => docFileInputRef.current?.click()}
                >
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                        <UploadCloud className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-2 font-headline">Upload Document</h3>
                    <p className="text-muted-foreground">Click or drag an image file to get started.</p>
                </div>
                <input ref={docFileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleDocChange} />
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="container py-8 px-4 md:px-6">
       <div className="flex items-center mb-6">
            <Link href="/" passHref>
                <Button variant="outline" size="icon" className="mr-4">
                <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <h1 className="text-3xl font-bold font-headline">Image Signer</h1>
        </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="overflow-hidden">
            <div ref={imageContainerRef} className="relative w-full aspect-[4/3] bg-muted/30 flex items-center justify-center">
              <Image
                src={document.url}
                alt="Document background"
                width={document.width}
                height={document.height}
                className="max-w-full max-h-full object-contain pointer-events-none"
              />
              {signature && (
                <div
                    className={cn(
                        "absolute z-10 cursor-move border-2 border-dashed border-accent/50",
                         dragState?.type === 'move' ? 'cursor-grabbing' : 'cursor-grab'
                    )}
                    style={{
                        left: `${signatureState.x}%`,
                        top: `${signatureState.y}%`,
                        width: signatureDisplayWidth,
                        height: signatureDisplayHeight,
                        transform: 'translate(-50%, -50%)',
                        touchAction: 'none'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                    onTouchStart={(e) => handleTouchStart(e, 'move')}
                >
                    <Image
                        src={signature.url}
                        alt="Signature"
                        fill
                        className="pointer-events-none"
                    />
                    <div
                        className={cn(
                            "absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-accent border-2 border-background cursor-nwse-resize",
                             dragState?.type === 'resize' && 'cursor-grabbing'
                        )}
                         onMouseDown={(e) => handleMouseDown(e, 'resize')}
                         onTouchStart={(e) => handleTouchStart(e, 'resize')}
                    />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </Card>
        </div>
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><PenSquare size={20}/> Your Signature</CardTitle>
                    <CardDescription>Upload an image of your signature. Transparent PNGs work best.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full" onClick={() => sigFileInputRef.current?.click()}>
                        <UploadCloud className="mr-2"/>
                        {signature ? 'Change Signature' : 'Upload Signature'}
                    </Button>
                    <input ref={sigFileInputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleSigChange}/>
                    {signature && (
                        <>
                        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted/20 p-2">
                           <Image src={signature.url} alt="Signature Preview" fill className="object-contain"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Signature Size</label>
                            <Slider value={[signatureState.width]} onValueChange={(v) => setSignatureState(s => ({...s, width: v[0]}))} min={5} max={100} step={1} />
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Download size={20}/> Export</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button className="w-full" size="lg" onClick={handleDownload} disabled={isProcessing || !signature}>
                        {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Download className="mr-2"/>}
                        Download Signed Image
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={resetState}>
                        <Trash2 className="mr-2"/>
                        Start Over
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}
