"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import dynamic from "next/dynamic";
import * as XLSX from "xlsx";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import TextStyler, { TextStyles } from "@/components/TextStyler";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
});

export default function CertificateEditor() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [fields, setFields] = useState<Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    styles?: TextStyles;
    pdfOffsetX?: number;
    pdfOffsetY?: number;
  }>>([]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setExcelFile(file);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
          
          setExcelData(jsonData);
          setAvailableFields(headers);
          setSelectedFields([]);
          setFields([]);
        } catch (error) {
          console.error('Error processing Excel file:', error);
          toast.error('Error processing Excel file. Please check the format and try again.');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleFieldSelection = (fieldName: string) => {
    if (selectedFields.includes(fieldName)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldName));
      setFields(fields.filter(f => f.name !== fieldName));
    } else {
      setSelectedFields([...selectedFields, fieldName]);
      const index = fields.length;
      setFields([...fields, {
        id: `field-${fieldName}`,
        name: fieldName,
        x: 100,
        y: 100 + (index * 50)
      }]);
    }
  };

  const handleFieldPositionUpdate = (id: string, x: number, y: number) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, x, y } : field
    ));
  };

  const handleFieldStyleUpdate = (id: string, styles: TextStyles) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, styles } : field
    ));
  };

  const handleProcessCertificates = async () => {
    if (!pdfFile || !excelData.length || !fields.length) {
      toast.error("Please upload a PDF template and Excel data, and add fields");
      return;
    }
  
    try {
      setIsProcessing(true);
      // Show loading toast
      toast.loading("Processing certificates...");
      
      // Read the PDF template
      const pdfBytes = await pdfFile.arrayBuffer();
      
      // Create a ZIP file
      const zip = new JSZip();
      
      // Process each row in the Excel data
      for (let i = 0; i < excelData.length; i++) {
        const rowData = excelData[i];
        
        // Clone the PDF for each row
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();
        
        // Add each field to the PDF
        for (const field of fields) {
          // Get the value from Excel data
          const value = rowData[field.name] !== undefined ? String(rowData[field.name]) : "";
          
          // Skip if no value
          if (!value) continue;
          
          // Calculate the adjusted position
          // This is based on the field's position in the PDF viewer
          const fontSize = field.styles?.fontSize || 16;
          
          // Get base field positions
          const baseX = field.x;
          const baseY = field.y;
          
          // Apply any manual offsets defined in the UI
          const pdfOffsetX = field.pdfOffsetX || 0;
          const pdfOffsetY = field.pdfOffsetY || 0;
          
          // Final position calculation - critical fix here!
          // PDF coordinates: origin at bottom-left, Y-axis goes up
          // UI coordinates: origin at top-left, Y-axis goes down
          const adjustedX = baseX + pdfOffsetX;
          
          // The key fix: properly invert the Y coordinate based on PDF height
          const adjustedY = height - baseY + pdfOffsetY -50;
          
          // Set text styling
          let font;
          if (field.styles?.fontFamily === "Times New Roman") {
            font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
          } else if (field.styles?.fontFamily === "Courier New") {
            font = await pdfDoc.embedFont(StandardFonts.Courier);
          } else {
            // Default to Helvetica for other fonts since PDF standard fonts are limited
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          }
          
          // Parse color from hex to RGB
          let color = { r: 0, g: 0, b: 0 }; // Default black
          if (field.styles?.color) {
            const hex = field.styles.color.replace('#', '');
            color = {
              r: parseInt(hex.substring(0, 2), 16) / 255,
              g: parseInt(hex.substring(2, 4), 16) / 255,
              b: parseInt(hex.substring(4, 6), 16) / 255
            };
          }
          
          // Add text to PDF with proper alignment
          const textAlignment = field.styles?.textAlign || 'left';
          let textOptions = {
            x: adjustedX,
            y: adjustedY,
            size: fontSize,
            font,
            color: rgb(color.r, color.g, color.b)
          };
          
          // Handle text alignment
          if (textAlignment === 'center') {
            const textWidth = font.widthOfTextAtSize(value, fontSize);
            textOptions.x = adjustedX - (textWidth / 2);
          } else if (textAlignment === 'right') {
            const textWidth = font.widthOfTextAtSize(value, fontSize);
            textOptions.x = adjustedX - textWidth;
          }
          
          // Add text to PDF
          firstPage.drawText(value, textOptions);
        }
        
        // Save the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        
        // Add to ZIP file
        const fileName = `certificate_${i + 1}.pdf`;
        zip.file(fileName, modifiedPdfBytes);
      }
      
      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Create a download link
      saveAs(zipBlob, "certificates.zip");
      
      // Show success toast
      toast.success(`Generated ${excelData.length} certificates successfully!`);
    } catch (error) {
      console.error("Error processing certificates:", error);
      toast.error("Error processing certificates. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Certificate Editor</h1>
          <Button 
            onClick={handleProcessCertificates}
            disabled={!pdfFile || !excelData.length || !fields.length || isProcessing}
          >
            {isProcessing ? "Processing..." : "Process Certificates"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <Tabs defaultValue="template" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="template" className="flex-1">Template</TabsTrigger>
                <TabsTrigger value="fields" className="flex-1">Fields</TabsTrigger>
                <TabsTrigger value="styling" className="flex-1">Styling</TabsTrigger>
              </TabsList>
              <TabsContent value="template">
                <Card className="p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Certificate Template</label>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("pdf-upload")?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload PDF
                      </Button>
                      <input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handlePDFUpload}
                      />
                      {pdfFile && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Uploaded: {pdfFile.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Data Source</label>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => document.getElementById("excel-upload")?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Excel
                      </Button>
                      <input
                        id="excel-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleExcelUpload}
                      />
                      {excelFile && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Uploaded: {excelFile.name} ({excelData.length} rows)
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </TabsContent>
              <TabsContent value="fields">
                <Card className="p-4">
                  <div className="space-y-4">
                    {availableFields.length > 0 ? (
                      <>
                        <h3 className="text-sm font-medium">Available Fields</h3>
                        <ul className="space-y-2">
                          {availableFields.map((field) => (
                            <li key={field} className="flex items-center">
                              <Checkbox 
                                id={`field-${field}`}
                                checked={selectedFields.includes(field)}
                                onCheckedChange={() => handleFieldSelection(field)}
                              />
                              <label 
                                htmlFor={`field-${field}`}
                                className="ml-2 text-sm cursor-pointer"
                              >
                                {field}
                              </label>
                            </li>
                          ))}
                        </ul>
                        
                        {selectedFields.length > 0 && (
                          <>
                            <h3 className="text-sm font-medium mt-4">Selected Fields</h3>
                            <ul className="space-y-2">
                              {fields.map((field) => (
                                <li key={field.id} className="p-2 bg-secondary rounded-md">
                                  {field.name} ({Math.round(field.x)}, {Math.round(field.y)})
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Upload an Excel file to see available fields
                      </p>
                    )}
                  </div>
                </Card>
              </TabsContent>
              <TabsContent value="styling">
                <Card className="p-4">
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Text Styling</h3>
                    
                    {fields.length > 0 ? (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-2">Select Field</label>
                          <select 
                            className="w-full p-2 border rounded-md"
                            value={selectedField || ''}
                            onChange={(e) => setSelectedField(e.target.value)}
                          >
                            <option value="">Select a field</option>
                            {fields.map((field) => (
                              <option key={field.id} value={field.id}>
                                {field.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {selectedField && (
                          <>
                            <TextStyler 
                              initialStyles={fields.find(f => f.id === selectedField)?.styles}
                              onStyleChange={(styles) => handleFieldStyleUpdate(selectedField, styles)}
                            />
                            
                            <div className="mt-4">
                              <h4 className="text-sm font-medium mb-2">Fine-tune PDF Position</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs">X Offset</label>
                                  <input 
                                    type="number" 
                                    className="w-full p-2 border rounded-md"
                                    value={fields.find(f => f.id === selectedField)?.pdfOffsetX || 0}
                                    onChange={(e) => {
                                      const offset = parseInt(e.target.value) || 0;
                                      setFields(fields.map(field => 
                                        field.id === selectedField ? { ...field, pdfOffsetX: offset } : field
                                      ));
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs">Y Offset</label>
                                  <input 
                                    type="number" 
                                    className="w-full p-2 border rounded-md"
                                    value={fields.find(f => f.id === selectedField)?.pdfOffsetY || 0}
                                    onChange={(e) => {
                                      const offset = parseInt(e.target.value) || 0;
                                      setFields(fields.map(field => 
                                        field.id === selectedField ? { ...field, pdfOffsetY: offset } : field
                                      ));
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Add fields to style them
                      </p>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="col-span-9">
            <Card className="w-full h-[calc(100vh-12rem)] bg-accent">
              {pdfFile ? (
                <PDFViewer 
                  file={pdfFile} 
                  fields={fields}
                  onFieldPositionUpdate={handleFieldPositionUpdate}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Upload a PDF template to begin</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}