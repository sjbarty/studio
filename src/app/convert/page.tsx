"use client";

import { useState, useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, UploadCloud, FileImage, FileSymlink, Loader2, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface SelectedImage {
  file: File;
  url: string;
}

export default function ConvertPage() {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: SelectedImage[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({ file, url: URL.createObjectURL(file) }));
    
    setSelectedImages(prev => [...prev, ...newImages]);

    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const removeImage = (indexToRemove: number) => {
    setSelectedImages(prev => {
        const imageToRemove = prev[indexToRemove];
        if (imageToRemove) {
            URL.revokeObjectURL(imageToRemove.url);
        }
        return prev.filter((_, index) => index !== indexToRemove);
    })
  }

  const handleConvertToPdf = async () => {
    if (selectedImages.length === 0) {
      toast({
        variant: "destructive",
        title: "No Images Selected",
        description: "Please select one or more images to convert.",
      });
      return;
    }

    setIsConverting(true);
    toast({
      title: "Converting to PDF",
      description: "Your PDF is being generated. This may take a moment.",
    });

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < selectedImages.length; i++) {
        const imageFile = selectedImages[i].file;
        
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error("Failed to read file."));
            }
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(imageFile);
        });
        
        const img = new window.Image();
        img.src = dataUrl;
        await new Promise(r => { img.onload = r });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        const aspect = img.width / img.height;
        let pdfImgWidth = pageWidth;
        let pdfImgHeight = pdfImgWidth / aspect;

        if (pdfImgHeight > pageHeight) {
          pdfImgHeight = pageHeight;
          pdfImgWidth = pdfImgHeight * aspect;
        }

        const x = (pageWidth - pdfImgWidth) / 2;
        const y = (pageHeight - pdfImgHeight) / 2;

        if (i > 0) {
          doc.addPage();
        }
        
        const format = dataUrl.substring(dataUrl.indexOf('/') + 1, dataUrl.indexOf(';'));
        doc.addImage(dataUrl, format.toUpperCase(), x, y, pdfImgWidth, pdfImgHeight);
      }

      doc.save('OptiPic_Images.pdf');
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Conversion Failed",
        description: "An error occurred while converting images to PDF.",
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="container flex flex-col items-center justify-start min-h-screen py-8">
      <div className="w-full max-w-4xl">
        <div className="flex items-center mb-6">
            <Link href="/" passHref>
                <Button variant="outline" size="icon" className="mr-4">
                <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <h1 className="text-3xl font-bold font-headline">Image to PDF Converter</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Your Images</CardTitle>
            <CardDescription>Select one or more images. Each image will be placed on a separate page in the PDF.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedImages.length === 0 ? (
                <div
                    className="relative flex flex-col items-center justify-center w-full min-h-[250px] rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card transition-colors hover:border-primary/50 hover:bg-primary/5"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFileChange({ target: { files: e.dataTransfer.files } } as any); }}
                >
                    <div 
                        className="relative z-10 flex flex-col items-center justify-center p-8 text-center cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <UploadCloud className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 font-headline">Click or drag images to upload</h3>
                        <p className="text-muted-foreground">PNG, JPG, and WEBP are supported.</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {selectedImages.map((image, index) => (
                            <div key={image.url} className="relative group">
                                <Image
                                    src={image.url}
                                    alt={`Selected image ${index + 1}`}
                                    width={150}
                                    height={150}
                                    className="w-full h-full object-cover rounded-md aspect-square"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-9 w-9"
                                        onClick={() => removeImage(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <button 
                            className="flex flex-col items-center justify-center w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/20 hover:border-primary transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileImage className="w-8 h-8 text-muted-foreground mb-2"/>
                            <span className="text-sm text-muted-foreground">Add more</span>
                        </button>
                    </div>
                </div>
            )}
             <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>
        
        <div className="flex justify-end mt-6">
            <Button size="lg" onClick={handleConvertToPdf} disabled={isConverting || selectedImages.length === 0}>
                {isConverting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <FileSymlink className="mr-2 h-4 w-4" />
                )}
                {isConverting ? 'Converting...' : `Convert to PDF (${selectedImages.length})`}
            </Button>
        </div>

      </div>
    </div>
  );
}
