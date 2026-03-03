import { PhotoEditor } from '@/components/photo-editor';
import { OptiPicLogo } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollageMaker } from "@/components/collage-maker";
import { BackgroundChanger } from "@/components/background-changer";
import { Crop, LayoutGrid, ImageMinus } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4 md:px-6">
          <a href="/" className="mr-6 flex items-center space-x-2">
            <OptiPicLogo className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline sm:inline-block">
              OptiPic
            </span>
          </a>
        </div>
      </header>
      <main className="flex-1">
        <Tabs defaultValue="editor" className="w-full">
          <div className="flex justify-center border-b">
            <TabsList className="grid w-full max-w-lg grid-cols-3 h-auto rounded-none bg-transparent p-0">
              <TabsTrigger value="editor" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3">
                <Crop className="mr-2" /> Editor
              </TabsTrigger>
              <TabsTrigger value="collage" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3">
                <LayoutGrid className="mr-2" /> Collage
              </TabsTrigger>
              <TabsTrigger value="background" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3">
                <ImageMinus className="mr-2" /> Background
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="editor">
            <PhotoEditor />
          </TabsContent>
          <TabsContent value="collage">
            <CollageMaker />
          </TabsContent>
          <TabsContent value="background">
            <BackgroundChanger />
          </TabsContent>
        </Tabs>
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
