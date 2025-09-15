"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { useAiPreferences } from "@/lib/hooks/use-ai-preferences";
import type { RiskProfile } from "@/lib/types";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { preferences, setRiskProfile, setDetailedAnalysis, isInitialized } = useAiPreferences();

  if (!isInitialized) {
    return null; // Or a loading skeleton
  }

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
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Modify the appearance of the user interface.
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
              <RadioGroup 
                value={preferences.riskProfile} 
                onValueChange={(value: string) => setRiskProfile(value as RiskProfile)}
                className="flex gap-4"
              >
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
              <Switch 
                id="detailed-analysis" 
                checked={preferences.detailedAnalysis}
                onCheckedChange={setDetailedAnalysis}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
