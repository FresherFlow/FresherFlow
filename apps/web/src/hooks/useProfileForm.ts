import { useCallback, useMemo, useState } from 'react';
import { COMMON_SKILLS, INDIAN_CITIES, normalizeSkillName } from '@/lib/profileConstants';

type ProfileLike = {
  educationLevel?: string | null;
  tenthYear?: number | null;
  twelfthYear?: number | null;
  gradCourse?: string | null;
  gradSpecialization?: string | null;
  gradYear?: number | null;
  pgCourse?: string | null;
  pgSpecialization?: string | null;
  pgYear?: number | null;
  interestedIn?: string[] | null;
  preferredCities?: string[] | null;
  workModes?: string[] | null;
  availability?: string | null;
  skills?: string[] | null;
};

export function useProfileForm(cityLimit = 5) {
  const [fullName, setFullName] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [tenthYear, setTenthYear] = useState('');
  const [twelfthYear, setTwelfthYear] = useState('');
  const [gradCourse, setGradCourse] = useState('');
  const [gradSpecialization, setGradSpecialization] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [hasPG, setHasPG] = useState(false);
  const [pgCourse, setPgCourse] = useState('');
  const [pgSpecialization, setPgSpecialization] = useState('');
  const [pgYear, setPgYear] = useState('');
  const [interestedIn, setInterestedIn] = useState<string[]>([]);
  const [preferredCities, setPreferredCities] = useState<string[]>([]);
  const [workModes, setWorkModes] = useState<string[]>([]);
  const [availability, setAvailability] = useState('IMMEDIATE');
  const [skills, setSkills] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const filteredSkillOptions = useMemo(
    () =>
      COMMON_SKILLS.filter(
        (s) => s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s)
      ).slice(0, 10),
    [skillInput, skills]
  );

  const filteredCityOptions = useMemo(
    () =>
      INDIAN_CITIES.filter(
        (c) => c.toLowerCase().includes(cityInput.toLowerCase()) && !preferredCities.includes(c)
      ).slice(0, 10),
    [cityInput, preferredCities]
  );

  const hydrateFromProfile = useCallback((profile: ProfileLike | null | undefined, userFullName?: string | null) => {
    if (!profile) return;
    setEducationLevel(profile.educationLevel || '');
    setTenthYear(profile.tenthYear?.toString() || '');
    setTwelfthYear(profile.twelfthYear?.toString() || '');
    setGradCourse(profile.gradCourse || '');
    setGradSpecialization(profile.gradSpecialization || '');
    setGradYear(profile.gradYear?.toString() || '');
    if (profile.pgCourse) {
      setHasPG(true);
      setPgCourse(profile.pgCourse);
      setPgSpecialization(profile.pgSpecialization || '');
      setPgYear(profile.pgYear?.toString() || '');
    } else {
      setHasPG(false);
      setPgCourse('');
      setPgSpecialization('');
      setPgYear('');
    }
    setInterestedIn(profile.interestedIn || []);
    setPreferredCities(profile.preferredCities || []);
    setWorkModes(profile.workModes || []);
    setAvailability(profile.availability || 'IMMEDIATE');
    const normalizedSkills = (profile.skills || []).map((skill) => normalizeSkillName(skill)).filter(Boolean);
    setSkills(Array.from(new Set(normalizedSkills)));
    if (userFullName) {
      setFullName((prev) => prev || userFullName);
    }
  }, []);

  const addSkillValue = useCallback((rawSkill: string) => {
    const s = normalizeSkillName(rawSkill);
    if (!s || skills.includes(s)) return false;
    setSkills((prev) => [...prev, s]);
    return true;
  }, [skills]);

  const addSkillFromInput = useCallback(() => {
    const added = addSkillValue(skillInput);
    if (!added) return false;
    setSkillInput('');
    return true;
  }, [addSkillValue, skillInput]);

  const togglePreferredCity = useCallback((city: string) => {
    const normalized = city.trim();
    if (!normalized) return { ok: false as const, reason: 'empty' as const };
    if (preferredCities.includes(normalized)) {
      setPreferredCities((prev) => prev.filter((c) => c !== normalized));
      return { ok: true as const };
    }
    if (preferredCities.length >= cityLimit) {
      return { ok: false as const, reason: 'limit' as const };
    }
    setPreferredCities((prev) => [...prev, normalized]);
    return { ok: true as const };
  }, [cityLimit, preferredCities]);

  const addCityFromInput = useCallback(() => {
    const result = togglePreferredCity(cityInput);
    if (result.ok) setCityInput('');
    return result;
  }, [cityInput, togglePreferredCity]);

  return {
    fullName,
    setFullName,
    educationLevel,
    setEducationLevel,
    tenthYear,
    setTenthYear,
    twelfthYear,
    setTwelfthYear,
    gradCourse,
    setGradCourse,
    gradSpecialization,
    setGradSpecialization,
    gradYear,
    setGradYear,
    hasPG,
    setHasPG,
    pgCourse,
    setPgCourse,
    pgSpecialization,
    setPgSpecialization,
    pgYear,
    setPgYear,
    interestedIn,
    setInterestedIn,
    preferredCities,
    setPreferredCities,
    workModes,
    setWorkModes,
    availability,
    setAvailability,
    skills,
    setSkills,
    cityInput,
    setCityInput,
    skillInput,
    setSkillInput,
    filteredSkillOptions,
    filteredCityOptions,
    hydrateFromProfile,
    addSkillValue,
    addSkillFromInput,
    addCityFromInput,
    togglePreferredCity,
  };
}
