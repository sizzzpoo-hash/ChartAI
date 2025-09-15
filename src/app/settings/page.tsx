"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
     <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
        <p className="text-muted-foreground">
          Customize your Chart Alchemist experience.
        </p>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Chart Appearance</CardTitle>
            <CardDescription>
              Modify the appearance of your trading charts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
                <span>Dark Mode</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Enable a darker color scheme for the interface.
                </span>
              </Label>
              <Switch 
                id="dark-mode" 
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="chart-style">Chart Color Scheme</Label>
              <Select defaultValue="blue-purple" disabled>
                <SelectTrigger id="chart-style">
                  <SelectValue placeholder="Select scheme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue-purple">Blue & Purple (Default)</SelectItem>
                  <SelectItem value="green-red">Classic Green & Red</SelectItem>
                  <SelectItem value="monochrome">Monochrome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Preferences</CardTitle>
            <CardDescription>
              Adjust how the AI analyzes charts and generates signals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-3">
              <Label>Risk Profile</Label>
              <RadioGroup defaultValue="moderate" className="flex gap-4" disabled>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="conservative" id="r1" />
                  <Label htmlFor="r1">Conservative</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate" id="r2" />
                  <Label htmlFor="r2">Moderate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="aggressive" id="r3" />
                  <Label htmlFor="r3">Aggressive</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="detailed-analysis" className="flex flex-col space-y-1">
                <span>Provide Detailed Analysis</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Receive a more in-depth breakdown with the trade signal.
                </span>
              </Label>
              <Switch id="detailed-analysis" defaultChecked disabled />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
