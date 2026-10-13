import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Loader2, Building2, Users, Landmark, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OfficialPhoto from '@/components/civics/OfficialPhoto';

export default function RepresentativeFinder({ userEmail, onDataLoaded }) {
  const [zipCode, setZipCode] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [profileId, setProfileId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [needsAddress, setNeedsAddress] = useState(false);

  const fetchWikipediaPhoto = async (title) => {
    if (!title) return '';
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`);
      if (!res.ok) return '';
      const json = await res.json();
      return json.thumbnail?.source || '';
    } catch {
      return '';
    }
  };

  const enrichPhotos = async (data) => {
    const [govPhoto, ...senatorResults] = await Promise.all([
      fetchWikipediaPhoto(data.governor_wikipedia_title),
      ...data.senators.map(s => fetchWikipediaPhoto(s.wikipedia_title)),
    ]);
    const repPhoto = await fetchWikipediaPhoto(data.representative?.wikipedia_title);

    return {
      ...data,
      governor_photo_url: govPhoto,
      senators: data.senators.map((s, i) => ({ ...s, photo_url: senatorResults[i] })),
      representative: { ...data.representative, photo_url: repPhoto },
    };
  };

  // Load saved data on mount
  useEffect(() => {
    if (!userEmail) return;
    const loadProfile = async () => {
      try {
        const normalizedEmail = userEmail.toLowerCase().trim();
        const profiles = await base44.entities.PublicProfile.filter(
          { user_email: normalizedEmail }, '-created_date', 1
        );
        if (profiles.length > 0) {
          const profile = profiles[0];
          setProfileId(profile.id);
          if (profile.zip_code) {
            setZipCode(profile.zip_code);
            if (profile.street_address) setStreetAddress(profile.street_address);
            setSaved(true);
          }
          if (profile.representative_data) {
            const saved = profile.representative_data;
            setResults(saved);
            if (onDataLoaded) onDataLoaded(saved);
            // If saved data has wikipedia titles but no photos, fetch them now
            const needsPhotos = saved.governor_wikipedia_title && !saved.governor_photo_url;
            if (needsPhotos) {
              enrichPhotos(saved).then(enriched => {
                setResults(prev => prev === saved ? enriched : prev);
                if (onDataLoaded) onDataLoaded(enriched);
              });
            }
          }
        }
      } catch (err) {
        console.error("Error loading profile", err);
      }
    };
    loadProfile();
  }, [userEmail]);

  const detectChanges = (oldData, newData) => {
    if (!oldData) return [];
    const changes = [];

    if (oldData.state_capital !== newData.state_capital) {
      changes.push({ field: 'State Capital', old: oldData.state_capital, new: newData.state_capital });
    }
    if (oldData.governor !== newData.governor) {
      changes.push({ field: 'Governor', old: oldData.governor, new: newData.governor });
    }

    const oldSenatorNames = (oldData.senators || []).map(s => s.name).sort().join(', ');
    const newSenatorNames = (newData.senators || []).map(s => s.name).sort().join(', ');
    if (oldSenatorNames !== newSenatorNames) {
      changes.push({ field: 'US Senators', old: oldSenatorNames, new: newSenatorNames });
    }

    if (oldData.representative?.name !== newData.representative?.name) {
      changes.push({
        field: 'US Representative',
        old: oldData.representative?.name || 'Unknown',
        new: newData.representative?.name || 'Unknown'
      });
    }

    return changes;
  };

  const notifyChanges = async (changes, state) => {
    if (changes.length === 0 || !userEmail) return;

    const changeList = changes.map(c => `• ${c.field}: ${c.old} → ${c.new}`).join('\n');

    try {
      // Send email notification
      await base44.integrations.Core.SendEmail({
        to: userEmail,
        subject: `Your ${state} representatives have changed`,
        body: `Hello!\n\nThe following elected officials for your area in ${state} have changed:\n\n${changeList}\n\nThese changes are now reflected in your civics test practice answers. Log in to review the updated information.\n\n— Citizenship Learning Hub`
      });

      // Create in-app notification
      await base44.entities.Notification.create({
        user_email: userEmail,
        type: 'alert',
        title: 'Representatives Updated',
        message: `${changes.length} change(s) detected for ${state}:\n${changeList.replace(/\n/g, ' ')}`,
        link: '/'
      });
    } catch (err) {
      console.error("Error sending notification", err);
    }
  };

  const handleSearch = async () => {
    if (!zipCode.trim() || zipCode.trim().length < 5) {
      setError('Please enter a valid 5-digit zip code.');
      return;
    }
    setError('');
    setLoading(true);
    const previousData = results;
    setResults(null);
    setSaved(false);

    try {
      const addressStr = streetAddress.trim();
      const promptText = addressStr
        ? `For the US address "${addressStr}, ${zipCode.trim()}", look up the EXACT current elected officials. Use the FULL street address to determine the PRECISE congressional district. Use ONLY official .gov, .org, and Wikipedia sources.`
        : `For US zip code ${zipCode.trim()}, look up the EXACT current elected officials. FIRST check if this zip code spans multiple congressional districts. Use ONLY official .gov, .org, and Wikipedia sources.`;

      const data = await base44.integrations.Core.InvokeLLM({
        prompt: `${promptText}

STEPS:
1. Determine which state this zip code belongs to.${addressStr ? ' Use the street address to pinpoint the EXACT congressional district.' : ''}
2. ${addressStr ? '' : 'CRITICAL — AMBIGUITY CHECK: Check if this zip code maps to ONE congressional district or MULTIPLE. Set district_ambiguous to true if it spans multiple districts. If ambiguous, list all possible district numbers in possible_districts (e.g. "Districts 3, 7, and 9"). Do NOT pick one at random — set the representative to the most likely one but flag it as ambiguous.'}
3. US Senators: Look up the TWO current US Senators for that state from senate.gov/senators/
4. US Representative: Look up the specific Representative for that congressional district from house.gov/representatives/${addressStr ? '' : ' — if ambiguous, pick the one covering the largest portion of this zip code but flag district_ambiguous: true'}
5. Governor: Look up the current Governor from nga.org/governors/
6. State capital: The official capital city of the state.

WIKIPEDIA PAGE TITLES — For EACH person, find the EXACT title of their Wikipedia page:
- Look up each person on Wikipedia and return the exact page title (e.g. "John_Fetterman", "Bernie_Sanders_(politician)", "Ron_DeSantis")
- The title is the part after /wiki/ in the URL
- Leave empty string "" if you cannot find a Wikipedia page

Double check all names are spelled correctly.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            state: { type: "string" },
            state_abbreviation: { type: "string" },
            state_capital: { type: "string" },
            governor: { type: "string" },
            governor_party: { type: "string" },
            governor_wikipedia_title: { type: "string" },
            district_ambiguous: { type: "boolean" },
            possible_districts: { type: "string" },
            senators: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  party: { type: "string" },
                  wikipedia_title: { type: "string" }
                }
              },
              minItems: 2,
              maxItems: 2
            },
            representative: {
              type: "object",
              properties: {
                name: { type: "string" },
                party: { type: "string" },
                district: { type: "string" },
                wikipedia_title: { type: "string" }
              }
            }
          },
          required: ["state", "state_capital", "governor", "senators", "representative", "district_ambiguous"]
        }
      });

      // If ambiguous and no address provided, prompt for address instead of showing results
      if (data.district_ambiguous && !addressStr) {
        setNeedsAddress(true);
        setLoading(false);
        return;
      }

      // Fetch photos from Wikipedia in parallel with showing results
      enrichPhotos(data).then(enriched => {
        setResults(prev => prev === data ? enriched : prev);
        if (onDataLoaded) onDataLoaded(enriched);
        saveToProfile(enriched);
        const changes = detectChanges(previousData, enriched);
        if (changes.length > 0) {
          notifyChanges(changes, data.state);
        }
      });

      // Show results IMMEDIATELY without photos — photos will fill in when ready
      setNeedsAddress(false);
      setResults(data);
      setLoading(false);
      if (onDataLoaded) onDataLoaded(data);
    } catch (err) {
      setError('Could not find representatives for this zip code. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const saveToProfile = async (data) => {
    if (!userEmail) return;
    setSaving(true);
    try {
      const normalizedEmail = userEmail.toLowerCase().trim();
      const profiles = await base44.entities.PublicProfile.filter(
        { user_email: normalizedEmail }, '-created_date', 1
      );

      if (profiles.length > 0) {
        const pid = profiles[0].id;
        await base44.entities.PublicProfile.update(pid, {
          zip_code: zipCode.trim(),
          street_address: streetAddress.trim() || undefined,
          representative_data: data
        });
        setProfileId(pid);
      }
      setSaved(true);
    } catch (err) {
      console.error("Error saving to profile", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 text-red-600 rounded-2xl mb-4">
          <MapPin className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Who Represents Me?</h2>
        <p className="text-slate-500 mt-2 max-w-lg mx-auto">
          Enter your zip code to find your Senators, Representative, Governor, and State Capital — your answers will be used during civics practice.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-8">
        {!needsAddress ? (
          <div className="flex gap-3">
            <Input
              placeholder="Enter your zip code..."
              value={zipCode}
              onChange={(e) => { setZipCode(e.target.value); setSaved(false); setNeedsAddress(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-12 text-lg"
              maxLength={10}
            />
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="h-12 px-6 bg-red-600 hover:bg-red-700"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 text-sm font-medium">
              This zip code spans multiple congressional districts. Please enter your street address so we can find your exact representative.
            </p>
            <Input
              placeholder="Enter your street address (e.g. 123 Main St)..."
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-12"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setNeedsAddress(false); setStreetAddress(''); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSearch}
                disabled={loading || !streetAddress.trim()}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find My Representative'}
              </Button>
            </div>
          </div>
        )}
        {loading && (
          <p className="text-blue-600 text-sm mt-3 text-center flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Searching house.gov, senate.gov, and nga.org...
          </p>
        )}
        {saving && !loading && (
          <p className="text-blue-600 text-sm mt-2 text-center flex items-center justify-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Saving to your profile...
          </p>
        )}
        {saved && !loading && !saving && (
          <p className="text-green-600 text-sm mt-2 text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Saved to your profile!
          </p>
        )}
        {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
      </div>

      {loading && !results && (
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-4">
          <div className="rounded-xl bg-slate-100 animate-pulse h-48" />
          <div className="rounded-xl bg-slate-100 animate-pulse h-48" />
        </div>
      )}

      {results && (
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">State Information</p>
                  <p className="text-lg font-bold text-slate-900">{results.state} ({results.state_abbreviation})</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">State Capital</p>
                  <p className="font-semibold text-slate-800">{results.state_capital}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 pl-2">
                <OfficialPhoto photoUrl={results.governor_photo_url} name={results.governor} size="md" />
                <div>
                  <p className="text-xs text-slate-500">Governor</p>
                  <p className="font-semibold text-slate-800">{results.governor} <span className="text-xs text-slate-400">({results.governor_party})</span></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 text-red-700 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">US Senators</p>
                </div>
              </div>
              {results.senators.map((senator, i) => (
                <div key={i} className="flex items-center gap-4 pl-2">
                  <OfficialPhoto photoUrl={senator.photo_url} name={senator.name} size="md" />
                  <div>
                    <p className="font-semibold text-slate-800">{senator.name}</p>
                    <p className="text-xs text-slate-400">{senator.party}</p>
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center gap-4 pl-2">
                  <OfficialPhoto photoUrl={results.representative?.photo_url} name={results.representative?.name} size="md" />
                  <div>
                    <p className="text-xs text-slate-500">US Representative</p>
                    <p className="font-semibold text-slate-800">{results.representative.name}</p>
                    <p className="text-xs text-slate-400">{results.representative.party} — District {results.representative.district}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

export function getPersonalizedAnswer(question, representativeData) {
  if (!representativeData || !question) return null;
  const q = question.toLowerCase();
  if (q.includes("senator") || q.includes("senators")) {
    return representativeData.senators.map(s => s.name).join(" and ");
  }
  if (q.includes("representative") || q.includes("house of representatives")) {
    return `${representativeData.representative.name} (District ${representativeData.representative.district})`;
  }
  if (q.includes("governor")) {
    return representativeData.governor;
  }
  if (q.includes("capital")) {
    return representativeData.state_capital;
  }
  return null;
}