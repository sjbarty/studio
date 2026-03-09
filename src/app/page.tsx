"use client";

import { useState } from "react";
import { PhotoEditor } from '@/components/photo-editor';
import { OptiPicLogo } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { CollageMaker } from "@/components/collage-maker";
import { BackgroundChanger } from "@/components/background-changer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";


export default function Home() {
  const [activeTool, setActiveTool] = useState("editor");

  const renderTool = () => {
    switch (activeTool) {
      case 'collage':
        return <CollageMaker />;
      case 'background':
        return <BackgroundChanger />;
      case 'editor':
      default:
        return <PhotoEditor />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4 md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="mr-4">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Additional Tools</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">New tools will appear here.</p>
              </div>
            </SheetContent>
          </Sheet>
          <a href="/" className="mr-6 flex items-center space-x-2">
            <OptiPicLogo className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline sm:inline-block">
              OptiPic
            </span>
          </a>
          <div className="flex-1 flex justify-center">
            <Tabs value={activeTool} onValueChange={setActiveTool} className="w-full max-w-sm">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="collage">Collage</TabsTrigger>
                <TabsTrigger value="background">Background</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="w-10" />
        </div>
      </header>
      <main className="flex-1">
        {renderTool()}
      </main>
      <footer className="w-full">
        <div className="container px-4 md:px-6">
            <Separator className="mb-8" />
            <div className="flex flex-col items-center justify-between gap-4 pb-8 md:flex-row">
            <p className="text-center text-sm text-muted-foreground md:text-left">
                Built for speed and privacy. All processing is done on your device.
            </p>
            <p className="text-center text-sm text-muted-foreground md:text-left">
                &copy; {new Date().getFullYear()} OptiPic. All Rights Reserved.
            </p>
            </div>
        </div>
      </footer>
    </div>
  );
}
