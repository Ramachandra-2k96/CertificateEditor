"use client";

import { useState } from "react";
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface TextStylerProps {
  onStyleChange: (styles: TextStyles) => void;
  initialStyles?: TextStyles;
}

export interface TextStyles {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textAlign: string;
  color: string;
}

const defaultStyles: TextStyles = {
  fontFamily: "Arial",
  fontSize: 16,
  fontWeight: "normal",
  fontStyle: "normal",
  textDecoration: "none",
  textAlign: "left",
  color: "#000000"
};

const fontFamilies = [
  "Arial",
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Helvetica"
];

export default function TextStyler({ onStyleChange, initialStyles = defaultStyles }: TextStylerProps) {
  const [styles, setStyles] = useState<TextStyles>(initialStyles);

  const updateStyle = (property: keyof TextStyles, value: any) => {
    const updatedStyles = { ...styles, [property]: value };
    setStyles(updatedStyles);
    onStyleChange(updatedStyles);
  };

  const toggleStyle = (property: 'fontWeight' | 'fontStyle' | 'textDecoration', value: string, defaultValue: string) => {
    updateStyle(property, styles[property] === value ? defaultValue : value);
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background">
      {/* Font Family */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Type className="h-3.5 w-3.5 mr-2" />
            {styles.fontFamily}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {fontFamilies.map((font) => (
            <DropdownMenuItem 
              key={font}
              onClick={() => updateStyle('fontFamily', font)}
              style={{ fontFamily: font }}
            >
              {font}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Font Size */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-16">
            {styles.fontSize}px
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="flex items-center gap-2">
            <Slider 
              value={[styles.fontSize]} 
              min={8} 
              max={72} 
              step={1}
              onValueChange={(value) => updateStyle('fontSize', value[0])}
            />
            <span className="w-12 text-center">{styles.fontSize}px</span>
          </div>
        </PopoverContent>
      </Popover>

      {/* Text Formatting */}
      <Button 
        variant={styles.fontWeight === 'bold' ? 'default' : 'outline'} 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => toggleStyle('fontWeight', 'bold', 'normal')}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      
      <Button 
        variant={styles.fontStyle === 'italic' ? 'default' : 'outline'} 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => toggleStyle('fontStyle', 'italic', 'normal')}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      
      <Button 
        variant={styles.textDecoration === 'underline' ? 'default' : 'outline'} 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => toggleStyle('textDecoration', 'underline', 'none')}
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>

      {/* Text Alignment */}
      <Button 
        variant={styles.textAlign === 'left' ? 'default' : 'outline'} 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => updateStyle('textAlign', 'left')}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      
      <Button 
        variant={styles.textAlign === 'center' ? 'default' : 'outline'} 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => updateStyle('textAlign', 'center')}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      
      <Button 
        variant={styles.textAlign === 'right' ? 'default' : 'outline'} 
        size="sm" 
        className="h-8 w-8 p-0"
        onClick={() => updateStyle('textAlign', 'right')}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Button>

      {/* Color Picker */}
      <div className="flex items-center">
        <input 
          type="color" 
          value={styles.color} 
          onChange={(e) => updateStyle('color', e.target.value)}
          className="w-8 h-8 p-0 border rounded cursor-pointer"
        />
      </div>
    </div>
  );
} 