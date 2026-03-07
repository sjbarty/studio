"use client";

import { useState } from "react";
import { PhotoEditor } from '@/components/photo-editor';
import { OptiPicLogo } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { CollageMaker } from "@/components/collage-maker";
import { BackgroundChanger } from "@/components/background-changer";
import { Crop, LayoutGrid, ImageMinus } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from "@/components/ui/sidebar";

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
    <SidebarProvider>
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center px-4 md:px-6">
              <SidebarTrigger className="mr-4" />
              <a href="/" className="mr-6 flex items-center space-x-2">
                <OptiPicLogo className="h-6 w-6 text-primary" />
                <span className="font-bold font-headline sm:inline-block">
                  OptiPic
                </span>
              </a>
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
      </SidebarInset>
      <Sidebar>
        <SidebarHeader>
          <a href="/" className="flex items-center space-x-2 p-2">
            <OptiPicLogo className="h-8 w-8 text-primary" />
            <span className="font-bold font-headline text-lg">
              OptiPic
            </span>
          </a>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTool('editor')} isActive={activeTool === 'editor'} tooltip="Photo Editor">
                <Crop />
                <span>Editor</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTool('collage')} isActive={activeTool === 'collage'} tooltip="Collage Maker">
                <LayoutGrid />
                <span>Collage</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTool('background')} isActive={activeTool === 'background'} tooltip="Background Remover">
                <ImageMinus />
                <span>Background</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <p className="text-xs text-muted-foreground px-2">© {new Date().getFullYear()} OptiPic</p>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
