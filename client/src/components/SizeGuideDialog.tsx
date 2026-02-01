import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ruler } from "lucide-react";

interface SizeGuideDialogProps {
    trigger?: React.ReactNode;
}

const sizeData = [
    { size: "XS", chest: "86-91", waist: "71-76", hips: "86-91" },
    { size: "S", chest: "91-96", waist: "76-81", hips: "91-96" },
    { size: "M", chest: "96-101", waist: "81-86", hips: "96-101" },
    { size: "L", chest: "101-106", waist: "86-91", hips: "101-106" },
    { size: "XL", chest: "106-111", waist: "91-96", hips: "106-111" },
    { size: "XXL", chest: "111-116", waist: "96-101", hips: "111-116" },
];

export function SizeGuideDialog({ trigger }: SizeGuideDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || (
                    <button className="text-sm text-accent hover:underline flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        Size Guide
                    </button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Ruler className="w-5 h-5" />
                        Size Guide
                    </DialogTitle>
                    <DialogDescription>
                        All measurements are in centimeters (cm)
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-muted">
                                <th className="border border-border px-4 py-2 text-left font-medium">Size</th>
                                <th className="border border-border px-4 py-2 text-left font-medium">Chest</th>
                                <th className="border border-border px-4 py-2 text-left font-medium">Waist</th>
                                <th className="border border-border px-4 py-2 text-left font-medium">Hips</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sizeData.map((row) => (
                                <tr key={row.size} className="hover:bg-muted/50 transition-colors">
                                    <td className="border border-border px-4 py-2 font-medium">{row.size}</td>
                                    <td className="border border-border px-4 py-2">{row.chest}</td>
                                    <td className="border border-border px-4 py-2">{row.waist}</td>
                                    <td className="border border-border px-4 py-2">{row.hips}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 p-4 bg-warm-beige/50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">How to Measure</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                        <li><strong>Chest:</strong> Measure around fullest part of your chest</li>
                        <li><strong>Waist:</strong> Measure around your natural waistline</li>
                        <li><strong>Hips:</strong> Measure around fullest part of your hips</li>
                    </ul>
                </div>
            </DialogContent>
        </Dialog>
    );
}
