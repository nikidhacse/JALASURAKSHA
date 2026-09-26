// JALASURAKSHA AI Risk Interpreter
// Converts numeric hydrodynamic physics into human-actionable disaster management directives,
// multi-lingual public emergency bulletins, and tactical operational SOPs

export function interpretHydrodynamicRisk({
  dam,
  simulationState,
  breachInfo,
  impactData
}) {
  const { currentSimMinute, settlementsStatus, distanceReachedKm } = simulationState;
  const criticalSettlements = settlementsStatus?.filter(s => s.isReached || s.minutesUntilFlood < 45) || [];

  const defaultHighRisk = { name: 'Downstream Sector', minutesUntilFlood: 30, peakDepthM: 2.5, currentDepthM: 0 };
  const highestRiskSettlement = (settlementsStatus && settlementsStatus.length > 0)
    ? (settlementsStatus.slice().sort((a, b) => a.minutesUntilFlood - b.minutesUntilFlood)[0] || settlementsStatus[0])
    : defaultHighRisk;

  // Tactical situation assessment
  let threatLevel = 'MODERATE';
  if ((breachInfo?.peakDischargeM3s || 0) > 8000 || (highestRiskSettlement.minutesUntilFlood || 30) <= 20) {
    threatLevel = 'CRITICAL CODE RED';
  } else if (breachInfo.peakDischargeM3s > 4000 || highestRiskSettlement.minutesUntilFlood <= 45) {
    threatLevel = 'SEVERE CODE ORANGE';
  }

  // Generative Plain-Language Advisory
  const executiveSummary = `At T+${currentSimMinute} minutes post-breach, a peak outflow wave of ${breachInfo.peakDischargeM3s.toLocaleString()} m³/s is advancing downstream along the ${dam.river} at ${breachInfo.delft3DMetrics.maxWavefrontVelocityMs} m/s. The flood bore has propagated ${distanceReachedKm} km, inundating approximately ${simulationState.floodedAreaKm2} km² of the basin. Immediate life-safety intervention is mandated for ${highestRiskSettlement.name}, with wave arrival estimated in ${highestRiskSettlement.minutesUntilFlood > 0 ? highestRiskSettlement.minutesUntilFlood + ' minutes' : 'ACTIVE INUNDATION (' + highestRiskSettlement.currentDepthM + 'm depth)'}.`;

  // Multi-lingual Emergency Public Broadcast Bulletins
  const regionalLang = dam.state === 'Tamil Nadu' ? 'Tamil' : dam.state === 'Kerala' ? 'Malayalam' : dam.state === 'Gujarat' ? 'Gujarati' : dam.state === 'Odisha' ? 'Odia' : 'Hindi';

  const bulletins = {
    english: {
      headline: `🚨 EMERGENCY FLASH FLOOD DIRECTIVE: IMMEDIATE EVACUATION ORDER`,
      body: `This is an official NDMA/SDMA emergency notification. Due to a major breach at ${dam.name}, a dangerous flood wave of depth exceeding ${highestRiskSettlement.peakDepthM}m will strike ${highestRiskSettlement.name} within ${Math.max(0, highestRiskSettlement.minutesUntilFlood)} minutes. DO NOT use low-lying river causeways or valley roads. Proceed immediately via designated high-elevation ridge corridors to designated relief shelters. Disconnect domestic power mains immediately.`,
      urgency: 'EXTREME LIFE SAFETY'
    },
    hindi: {
      headline: `🚨 आपातकालीन बाढ़ चेतावनी: तत्काल निकासी का आदेश`,
      body: `यह राज्य आपदा प्रबंधन प्राधिकरण की आधिकारिक चेतावनी है। ${dam.name} में बड़े जलप्रलय के कारण ${highestRiskSettlement.name} में अगले ${Math.max(0, highestRiskSettlement.minutesUntilFlood)} मिनट के भीतर ${highestRiskSettlement.peakDepthM} मीटर ऊंची विनाशकारी बाढ़ की लहर पहुंच रही है। निचले तटवर्ती रास्तों का उपयोग न करें। तुरंत ऊंचाई वाले सुरक्षित राहत शिविरों की ओर प्रस्थान करें।`,
      urgency: 'अति संवेदनशील'
    },
    regional: {
      language: regionalLang,
      headline: dam.state === 'Tamil Nadu'
        ? `🚨 அவசர வெள்ள அபாய எச்சரிக்கை: உடனடி வெளியேற்ற உத்தரவு`
        : `🚨 അടിയന്തിര പ്രളയ മുന്നറിയിപ്പ്: ഉടൻ ഒഴിപ്പിക്കൽ നിർദ്ദേശം`,
      body: dam.state === 'Tamil Nadu'
        ? `${dam.name} அணை உடைந்ததால் உருவாகியுள்ள கடும் வெள்ள அலை இன்னும் ${Math.max(0, highestRiskSettlement.minutesUntilFlood)} நிமிடங்களில் ${highestRiskSettlement.name} பகுதியை அடையும். ஆற்றோர தாழ்வான சாலைகளை பயன்படுத்த வேண்டாம். உடனடியாக மலைப்பாதை வழியாக பாதுகாப்பான முகாம்களுக்கு செல்லவும்!`
        : `${dam.name} അണക്കെട്ടിലെ വലിയ തകർച്ചയെ തുടർന്ന് പെരിയാർ നദിയിൽ അടുത്ത ${Math.max(0, highestRiskSettlement.minutesUntilFlood)} മിനിറ്റിൽ ഉയർന്ന പ്രളയജലം എത്തും. നദീതീര റോഡുകൾ ഒഴിവാക്കി ഉയർന്ന അഭയകേന്ദ്രങ്ങളിലേക്ക് ഉടൻ മാറുക!`
    }
  };

  // Tactical Operational Incident Command SOP Checklist
  const operationalSop = [
    {
      id: 'sop-1',
      phase: 'T-30m Lead Time',
      action: `Sound Continuous 3-Minute Air Raid Sirens across ${criticalSettlements.map(s => s.name).join(', ')}.`,
      status: highestRiskSettlement.minutesUntilFlood <= 35 ? 'ACTIVE EXECUTION' : 'STANDBY',
      responsibleAgency: 'District Emergency Operations Centre (DEOC)'
    },
    {
      id: 'sop-2',
      phase: 'Immediate Hazard Prevention',
      action: 'De-energize 11kV & 33kV Electrical Sub-stations in valley floor to prevent fatal electrocution and transformer explosions.',
      status: 'MANDATED PRIORITY 1',
      responsibleAgency: 'State Electricity Board Grid Dispatch'
    },
    {
      id: 'sop-3',
      phase: 'Corridor Isolation',
      action: `Deploy Police & Traffic Barricades to block ${dam.infrastructure.bridges[0]?.name || 'Bridge Causeway'}. Prevent vehicle entry.`,
      status: 'CRITICAL ISOLATION',
      responsibleAgency: 'Traffic & Highway Patrol Force'
    },
    {
      id: 'sop-4',
      phase: 'Hospital Evacuation',
      action: `Transfer ${dam.infrastructure.hospitals[0]?.icuPatients || 12} ICU patients and oxygen support from ${dam.infrastructure.hospitals[0]?.name || 'Civil Hospital'} to higher elevation facility.`,
      status: 'ACTIVE TRANSPORT',
      responsibleAgency: 'Health Services / 108 Ambulance Fleet'
    },
    {
      id: 'sop-5',
      phase: 'Search & Rescue Staging',
      action: 'Stage 3 NDRF Flood Rescue Battalions with inflatable motorized boats at Ridge Camp perimeter.',
      status: 'DEPLOYED ON HIGH GROUND',
      responsibleAgency: 'NDRF 04 Battalion / SDRF'
    }
  ];

  return {
    threatLevel,
    executiveSummary,
    bulletins,
    operationalSop,
    highestRiskSettlement
  };
}

/**
 * Text-to-speech emergency broadcast synthesizer
 */
export function playVoiceAlert(text) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
    return true;
  }
  return false;
}
