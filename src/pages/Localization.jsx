import React, { useEffect, useState } from 'react';
import { i18nAdminService } from '../services/i18nAdminService';

export default function Localization() {
  const [activeTab, setActiveTab] = useState('languages');
  const [languages, setLanguages] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishedInfo, setPublishedInfo] = useState(null);

  // Values Editor state
  const [selectedLang, setSelectedLang] = useState('en');
  const [englishMap, setEnglishMap] = useState({});
  const [valuesMap, setValuesMap] = useState({});
  const [savingKeyId, setSavingKeyId] = useState(null);
  const [savedKeyId, setSavedKeyId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loadingValues, setLoadingValues] = useState(false);

  // New Language state
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [newLangNative, setNewLangNative] = useState('');
  const [newLangDirection, setNewLangDirection] = useState('ltr');

  // New Key state
  const [newKeyString, setNewKeyString] = useState('');
  const [newKeyCategory, setNewKeyCategory] = useState('common');
  const [newKeyNamespace, setNewKeyNamespace] = useState('mobile');

  // 1-Step Add Translation String Modal state
  const [showAddStringModal, setShowAddStringModal] = useState(false);
  const [newEnglishText, setNewEnglishText] = useState('');
  const [newTargetText, setNewTargetText] = useState('');
  const [newStringCategory, setNewStringCategory] = useState('common');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [newCustomKey, setNewCustomKey] = useState('');
  const [creatingString, setCreatingString] = useState(false);

  // Live JSON Editor state
  const [editorMode, setEditorMode] = useState('table'); // 'table' | 'json'
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [jsonValidKeyCount, setJsonValidKeyCount] = useState(0);

  // Delete Language Modal state
  const [deleteTargetLang, setDeleteTargetLang] = useState(null);
  const [deletingLang, setDeletingLang] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'values' && selectedLang) {
      fetchValues(selectedLang);
    }
  }, [activeTab, selectedLang]);

  useEffect(() => {
    if (editorMode === 'json' && keys.length > 0) {
      const mapObj = {};
      keys.forEach(k => {
        const val = valuesMap[k._id] ?? englishMap[k._id] ?? '';
        mapObj[k.key] = val;
      });
      const formatted = JSON.stringify(mapObj, null, 2);
      setJsonText(formatted);
      validateJson(formatted);
    }
  }, [editorMode, selectedLang, valuesMap, keys]);

  const validateJson = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('JSON must be a valid key-value object e.g. { "common.welcome": "Hello" }');
        setJsonValidKeyCount(0);
        return false;
      }
      setJsonError(null);
      setJsonValidKeyCount(Object.keys(parsed).length);
      return true;
    } catch (err) {
      setJsonError(err.message);
      setJsonValidKeyCount(0);
      return false;
    }
  };

  const handleJsonChange = (e) => {
    const text = e.target.value;
    setJsonText(text);
    validateJson(text);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      validateJson(formatted);
    } catch (err) {
      alert(`Cannot format invalid JSON: ${err.message}`);
    }
  };

  const handleBulkSaveJson = async () => {
    if (!validateJson(jsonText)) {
      alert('Please fix JSON syntax errors before saving.');
      return;
    }

    const parsed = JSON.parse(jsonText);
    setSavingKeyId('bulk');
    try {
      const keyMapByString = {};
      keys.forEach(k => { keyMapByString[k.key] = k; });

      for (const [keyStr, valStr] of Object.entries(parsed)) {
        let keyObj = keyMapByString[keyStr];
        if (!keyObj) {
          const parts = keyStr.split('.');
          const cat = parts.length > 1 ? parts[0] : 'common';
          const keyRes = await i18nAdminService.createKey({ key: keyStr, category: cat, namespace: 'mobile' });
          keyObj = keyRes.data?.data || keyRes.data;
        }
        if (keyObj && keyObj._id) {
          await i18nAdminService.upsertValue({
            keyId: keyObj._id,
            languageCode: selectedLang,
            value: String(valStr),
            status: 'approved'
          });
        }
      }
      alert(`Successfully saved ${Object.keys(parsed).length} translation values for ${selectedLang.toUpperCase()}!`);
      await fetchData();
      if (selectedLang) await fetchValues(selectedLang);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to bulk save JSON values');
    } finally {
      setSavingKeyId(null);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [langRes, keyRes] = await Promise.all([
        i18nAdminService.getLanguages(),
        i18nAdminService.getKeys()
      ]);
      const rawLangs = langRes.data?.data || langRes.data;
      const rawKeys = keyRes.data?.data || keyRes.data;
      const parsedLangs = Array.isArray(rawLangs) ? rawLangs : [];
      setLanguages(parsedLangs);
      setKeys(Array.isArray(rawKeys) ? rawKeys : []);
      if (parsedLangs.length > 0 && !selectedLang) {
        setSelectedLang(parsedLangs[0].code);
      }
    } catch (e) {
      console.error(e);
      setLanguages([]);
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchValues = async (langCode) => {
    setLoadingValues(true);
    try {
      const [enRes, targetRes] = await Promise.all([
        i18nAdminService.getValues('en'),
        langCode === 'en' ? Promise.resolve(null) : i18nAdminService.getValues(langCode)
      ]);

      const rawEn = enRes.data?.data || enRes.data || [];
      const enMap = {};
      if (Array.isArray(rawEn)) {
        rawEn.forEach(v => { enMap[v.keyId] = v.value; });
      }
      setEnglishMap(enMap);

      const map = {};
      if (langCode === 'en') {
        rawEn.forEach(v => { map[v.keyId] = v.value; });
      } else if (targetRes) {
        const rawTarget = targetRes.data?.data || targetRes.data || [];
        if (Array.isArray(rawTarget)) {
          rawTarget.forEach(v => { map[v.keyId] = v.value; });
        }
      }
      setValuesMap(map);
    } catch (e) {
      console.error('Failed to fetch values', e);
      setValuesMap({});
    } finally {
      setLoadingValues(false);
    }
  };

  const handleValueChange = (keyId, text) => {
    setValuesMap(prev => ({
      ...prev,
      [keyId]: text
    }));
  };

  const handleSaveValue = async (keyId) => {
    const valText = valuesMap[keyId] || '';
    setSavingKeyId(keyId);
    try {
      await i18nAdminService.upsertValue({
        keyId,
        languageCode: selectedLang,
        value: valText,
        status: 'approved'
      });
      setSavedKeyId(keyId);
      setTimeout(() => setSavedKeyId(null), 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save value');
    } finally {
      setSavingKeyId(null);
    }
  };

  const handleAddLanguage = async (e) => {
    e.preventDefault();
    if (!newLangCode || !newLangName) return;
    try {
      await i18nAdminService.addLanguage({
        code: newLangCode,
        name: newLangName,
        nativeName: newLangNative || newLangName,
        direction: newLangDirection
      });
      setNewLangCode('');
      setNewLangName('');
      setNewLangNative('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add language');
    }
  };

  const openDeleteModal = (code, name) => {
    if (code === 'en') {
      alert('Cannot delete default language (en)');
      return;
    }
    setDeleteTargetLang({ code, name: name || code });
  };

  const confirmDeleteLanguage = async () => {
    if (!deleteTargetLang) return;
    setDeletingLang(true);
    try {
      await i18nAdminService.deleteLanguage(deleteTargetLang.code);
      if (selectedLang === deleteTargetLang.code) {
        setSelectedLang('en');
      }
      setDeleteTargetLang(null);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete language');
    } finally {
      setDeletingLang(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyString) return;
    try {
      await i18nAdminService.createKey({
        key: newKeyString,
        category: newKeyCategory,
        namespace: newKeyNamespace
      });
      setNewKeyString('');
      fetchData();
      if (selectedLang) fetchValues(selectedLang);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create key');
    }
  };

  const handleOneStepCreateString = async (e) => {
    e.preventDefault();
    if (!newEnglishText.trim()) return;
    setCreatingString(true);
    try {
      const finalCategory = newStringCategory === '__custom__' ? (customCategoryInput.trim() || 'common') : newStringCategory;
      const slug = newEnglishText
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '');
      const generatedKey = newCustomKey.trim() || `${finalCategory}.${slug}`;

      // 1. Create key
      const keyRes = await i18nAdminService.createKey({
        key: generatedKey,
        category: finalCategory,
        namespace: 'mobile'
      });
      const createdKey = keyRes.data?.data || keyRes.data;

      // 2. Save English baseline
      await i18nAdminService.upsertValue({
        keyId: createdKey._id,
        languageCode: 'en',
        value: newEnglishText.trim(),
        status: 'approved'
      });

      // 3. Save target translation if provided and target != en
      if (newTargetText.trim() && selectedLang !== 'en') {
        await i18nAdminService.upsertValue({
          keyId: createdKey._id,
          languageCode: selectedLang,
          value: newTargetText.trim(),
          status: 'approved'
        });
      }

      setNewEnglishText('');
      setNewTargetText('');
      setNewCustomKey('');
      setCustomCategoryInput('');
      setShowAddStringModal(false);
      await fetchData();
      if (selectedLang) await fetchValues(selectedLang);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create translation string');
    } finally {
      setCreatingString(false);
    }
  };

  const handlePublish = async (code) => {
    try {
      const res = await i18nAdminService.publishRelease({ languageCode: code, namespace: 'mobile' });
      const releaseData = res.data?.data || res.data;
      const baseUrl = window.location.origin.includes('5174')
        ? 'http://localhost:8001'
        : window.location.origin;

      const bundleUrl = `${baseUrl}/api/v1/i18n/bundles/${code}/mobile`;
      const manifestUrl = `${baseUrl}/api/v1/i18n/manifest`;

      setPublishedInfo({
        code,
        version: releaseData?.version || 1,
        checksum: releaseData?.checksum || 'active',
        bundleUrl,
        manifestUrl
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish release');
    }
  };

  if (loading) {
    return <div className="p-6">Loading localization settings...</div>;
  }

  const defaultPresets = ['common', 'auth', 'shopScreen', 'wallet', 'chat', 'agencies', 'cashout', 'convert', 'login', 'otp', 'profile'];
  const existingCategories = Array.from(new Set(keys.map(k => k.category || 'common').filter(Boolean)));
  const filterCategories = existingCategories.sort();
  const allKnownCategories = Array.from(new Set([...defaultPresets, ...existingCategories])).sort();

  const filteredKeys = keys.filter(k => {
    const categoryMatch = selectedCategory === 'all' || (k.category || 'common') === selectedCategory;
    if (!categoryMatch) return false;
    if (!searchFilter.trim()) return true;

    const q = searchFilter.toLowerCase();
    const enVal = (englishMap[k._id] || '').toLowerCase();
    const targetVal = (valuesMap[k._id] || '').toLowerCase();
    const keyStr = (k.key || '').toLowerCase();
    return enVal.includes(q) || keyStr.includes(q) || targetVal.includes(q);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Multi-Language Localization</h1>
          <p className="text-sm text-gray-500 mt-1">Manage languages, English baseline reference strings, and target translations for Go-Live.</p>
        </div>
        <button
          onClick={() => setShowAddStringModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Add Translation String</span>
        </button>
      </div>

      {/* Published Notification Banner */}
      {publishedInfo && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-green-900">
              🎉 Release Version {publishedInfo.version} Published for {publishedInfo.code.toUpperCase()}!
            </h3>
            <button
              onClick={() => setPublishedInfo(null)}
              className="text-green-700 hover:text-green-900 text-sm font-bold"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-green-800">
            The updated JSON bundle is now live and accessible to the mobile app. Click the links below to inspect:
          </p>
          <div className="flex flex-wrap gap-4 pt-1 text-sm font-medium">
            <a
              href={publishedInfo.bundleUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 shadow-sm"
            >
              🔗 Open Published Bundle JSON ({publishedInfo.code.toUpperCase()})
            </a>
            <a
              href={publishedInfo.manifestUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-3 py-1.5 bg-white border border-green-600 text-green-700 rounded hover:bg-green-50 shadow-sm"
            >
              🌐 Open Server Manifest API
            </a>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b space-x-4">
        <button
          className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'languages' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('languages')}
        >
          Languages ({languages.length})
        </button>
        <button
          className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'values' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('values')}
        >
          Translation Values Editor
        </button>
        <button
          className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'keys' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('keys')}
        >
          Advanced System Keys ({keys.length})
        </button>
      </div>

      {activeTab === 'languages' && (
        <div className="space-y-8">
          {/* Add Language Form */}
          <form onSubmit={handleAddLanguage} className="bg-white p-5 rounded-lg shadow-sm border max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Add New Target Language</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Language Code (e.g. es, ar, fr)</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newLangCode}
                onChange={e => setNewLangCode(e.target.value)}
                placeholder="es"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">English Display Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newLangName}
                onChange={e => setNewLangName(e.target.value)}
                placeholder="Spanish"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Native Name</label>
              <input
                type="text"
                className="mt-1 block w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newLangNative}
                onChange={e => setNewLangNative(e.target.value)}
                placeholder="Español"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Text Direction</label>
              <select
                className="mt-1 block w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newLangDirection}
                onChange={e => setNewLangDirection(e.target.value)}
              >
                <option value="ltr">LTR (Left to Right)</option>
                <option value="rtl">RTL (Right to Left - Arabic/Hebrew)</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
              Add Language
            </button>
          </form>

          {/* Languages Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Native Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Direction</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Default</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Release Version</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {([...(Array.isArray(languages) ? languages : [])].sort((a, b) => {
                  const aDef = a.isDefault || a.code === 'en';
                  const bDef = b.isDefault || b.code === 'en';
                  if (aDef && !bDef) return -1;
                  if (!aDef && bDef) return 1;
                  return a.code.localeCompare(b.code);
                })).map(lang => {
                  const baseUrl = window.location.origin.includes('5174')
                    ? 'http://localhost:8001'
                    : window.location.origin;
                  const langBundleUrl = `${baseUrl}/api/v1/i18n/bundles/${lang.code}/mobile`;
                  const isDefaultLang = lang.isDefault || lang.code === 'en';

                  return (
                    <tr key={lang.code} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-gray-900">{lang.code.toUpperCase()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{lang.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{lang.nativeName}</td>
                      <td className="px-6 py-4 uppercase text-xs font-semibold text-gray-500">{lang.direction}</td>
                      <td className="px-6 py-4 text-sm">
                        {isDefaultLang ? (
                          <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-full">Default</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          v{lang.latestReleaseVersion || 1} (Live)
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={() => handlePublish(lang.code)}
                          className="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 shadow-sm"
                        >
                          🚀 Publish Release
                        </button>
                        <a
                          href={langBundleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block px-3 py-1 bg-gray-100 border text-gray-700 text-xs font-medium rounded hover:bg-gray-200"
                        >
                          View Live JSON ↗
                        </a>
                        <button
                          onClick={() => openDeleteModal(lang.code, lang.name)}
                          disabled={isDefaultLang}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            isDefaultLang
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                              : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white'
                          }`}
                          title={isDefaultLang ? 'Cannot delete default English language' : 'Delete language'}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'values' && (
        <div className="space-y-6">
          {/* Top Bar Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Target Language</label>
                <select
                  className="border rounded-md p-2 text-sm font-semibold text-gray-900 bg-gray-50 focus:ring-2 focus:ring-indigo-500"
                  value={selectedLang}
                  onChange={e => setSelectedLang(e.target.value)}
                >
                  {languages.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.name} ({l.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category / Domain Filter</label>
                <select
                  className="border rounded-md p-2 text-sm text-gray-900 bg-gray-50 focus:ring-2 focus:ring-indigo-500"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories ({keys.length})</option>
                  {filterCategories.map(cat => {
                    const count = keys.filter(k => (k.category || 'common') === cat).length;
                    return (
                      <option key={cat} value={cat}>
                        {cat} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex-1 max-w-md w-full">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search English Text / Keys</label>
                <input
                  type="text"
                  className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Search English text, target text, or key..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              {/* View Mode Toggle: Table View vs Live JSON Editor */}
              <div className="flex bg-gray-100 p-1 rounded-lg border">
                <button
                  onClick={() => setEditorMode('table')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    editorMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📋 Table View
                </button>
                <button
                  onClick={() => setEditorMode('json')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    editorMode === 'json' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ⚡ Live JSON Editor
                </button>
              </div>

              <button
                onClick={() => handlePublish(selectedLang)}
                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 shadow-sm flex items-center gap-2"
              >
                <span>🚀</span> Publish Release ({selectedLang.toUpperCase()})
              </button>
            </div>
          </div>

          {/* Content Switcher: Table View vs Live JSON Canvas */}
          {editorMode === 'table' ? (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {loadingValues ? (
                <div className="p-8 text-center text-gray-500">Loading translation values for {selectedLang.toUpperCase()}...</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-2/5">English Reference Text</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Target Translation ({selectedLang.toUpperCase()})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredKeys.map(k => {
                      const enValue = englishMap[k._id] || '';
                      const currentVal = valuesMap[k._id] ?? '';
                      const isSaving = savingKeyId === k._id;
                      const isSaved = savedKeyId === k._id;

                      return (
                        <tr key={k._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 align-top">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded border text-xs font-medium inline-block">
                              {k.category || 'common'}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="text-sm font-medium text-gray-900">
                              {enValue || <span className="text-gray-400 italic">No English text set</span>}
                            </div>
                            <div className="text-xs font-mono text-gray-400 mt-1">{k.key}</div>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex gap-3 items-center">
                              <input
                                type="text"
                                className="flex-1 border rounded-md p-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={currentVal}
                                onChange={e => handleValueChange(k._id, e.target.value)}
                                placeholder={`Enter ${selectedLang.toUpperCase()} translation...`}
                              />
                              <button
                                onClick={() => handleSaveValue(k._id)}
                                disabled={isSaving}
                                className={`px-3 py-2 text-xs font-semibold rounded-md shadow-sm transition-colors min-w-[75px] ${
                                  isSaved
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                              >
                                {isSaving ? 'Saving...' : isSaved ? '✓ Saved' : 'Save'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredKeys.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                          No translation strings match your search or category filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>⚡ Live JSON Editor</span>
                    <span className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                      {selectedLang.toUpperCase()}.json
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Directly inspect, edit, or paste raw JSON translation objects for {selectedLang.toUpperCase()}.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleFormatJson}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 border text-xs font-semibold rounded-md hover:bg-gray-200 flex items-center gap-1.5"
                  >
                    <span>🧹</span> Format JSON
                  </button>
                  <button
                    onClick={handleBulkSaveJson}
                    disabled={!!jsonError || savingKeyId === 'bulk'}
                    className={`px-4 py-1.5 text-xs font-semibold text-white rounded-md shadow-sm flex items-center gap-1.5 ${
                      jsonError
                        ? 'bg-gray-400 cursor-not-allowed'
                        : savingKeyId === 'bulk'
                        ? 'bg-indigo-400 cursor-wait'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    <span>💾</span> {savingKeyId === 'bulk' ? 'Saving JSON...' : 'Save & Apply JSON'}
                  </button>
                  <button
                    onClick={() => handlePublish(selectedLang)}
                    className="px-4 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 shadow-sm flex items-center gap-1.5"
                  >
                    <span>🚀</span> Publish Release
                  </button>
                </div>
              </div>

              {/* Real-time Syntax Validation Bar */}
              {jsonError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs font-medium text-red-800 flex items-center gap-2">
                  <span className="text-sm">🔴</span>
                  <span>Syntax Error: {jsonError}</span>
                </div>
              ) : (
                <div className="p-2.5 bg-green-50 border border-green-200 rounded-md text-xs font-medium text-green-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🟢</span>
                    <span>Valid JSON Object — {jsonValidKeyCount} translation keys detected.</span>
                  </div>
                  <span className="text-[11px] text-green-700 font-medium">Ready to save or publish live</span>
                </div>
              )}

              {/* Code Canvas Editor */}
              <div className="relative font-mono text-sm">
                <textarea
                  value={jsonText}
                  onChange={handleJsonChange}
                  rows={22}
                  className={`w-full p-4 font-mono text-sm leading-relaxed rounded-lg border focus:ring-2 focus:outline-none transition-colors ${
                    jsonError
                      ? 'bg-red-950 text-red-200 border-red-500 focus:ring-red-500'
                      : 'bg-gray-900 text-emerald-400 border-gray-800 focus:ring-indigo-500'
                  }`}
                  placeholder='{\n  "common.welcome": "Hello"\n}'
                  spellCheck="false"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'keys' && (
        <div className="space-y-8">
          {/* Create Key Form */}
          <form onSubmit={handleCreateKey} className="bg-white p-5 rounded-lg shadow-sm border max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Create System Translation Key</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Key String (e.g. common.watchNow)</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newKeyString}
                onChange={e => setNewKeyString(e.target.value)}
                placeholder="common.watchNow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input
                type="text"
                className="mt-1 block w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newKeyCategory}
                onChange={e => setNewKeyCategory(e.target.value)}
                placeholder="common"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Namespace</label>
              <select
                className="mt-1 block w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                value={newKeyNamespace}
                onChange={e => setNewKeyNamespace(e.target.value)}
              >
                <option value="mobile">mobile</option>
                <option value="web">web</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
              Create Key
            </button>
          </form>

          {/* Keys Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Key String</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Namespace</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Variables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(Array.isArray(keys) ? keys : []).map(k => (
                  <tr key={k._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900">{k.key}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{k.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{k.namespace}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{k.variables?.join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1-Step Add Translation String Modal */}
      {showAddStringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Add New Translation String</h3>
              <button
                onClick={() => setShowAddStringModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOneStepCreateString} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">English Text (Baseline Reference) *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Instant Top-up"
                  value={newEnglishText}
                  onChange={e => setNewEnglishText(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700">Category / Domain *</label>
                <select
                  className="mt-1 block w-full border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={newStringCategory}
                  onChange={e => setNewStringCategory(e.target.value)}
                >
                  {allKnownCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">➕ Add Custom Category...</option>
                </select>

                {newStringCategory === '__custom__' && (
                  <input
                    type="text"
                    required
                    className="mt-2 block w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Type custom category name (e.g. settings)"
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value)}
                  />
                )}
              </div>

              {selectedLang !== 'en' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700">
                    Target Translation ({selectedLang.toUpperCase()}) (Optional)
                  </label>
                  <input
                    type="text"
                    className="mt-1 block w-full border rounded-md p-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder={`e.g. Recarga Instantánea`}
                    value={newTargetText}
                    onChange={e => setNewTargetText(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Key String Override (Optional)</label>
                <input
                  type="text"
                  className="mt-1 block w-full border rounded-md p-2 text-xs font-mono text-gray-600"
                  placeholder={`Auto-generated e.g. ${newStringCategory}.${newEnglishText.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'key'}`}
                  value={newCustomKey}
                  onChange={e => setNewCustomKey(e.target.value)}
                />
                <span className="text-xs text-gray-400">Leave blank to auto-generate from Category + English text.</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddStringModal(false)}
                  className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingString}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 shadow-sm"
                >
                  {creatingString ? 'Creating...' : 'Create String'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Language Confirmation Modal */}
      {deleteTargetLang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Language?</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <p>
                Are you sure you want to delete <span className="font-bold text-gray-900">{deleteTargetLang.name}</span> (<span className="font-mono font-bold text-red-600">{deleteTargetLang.code.toUpperCase()}</span>)?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <span>⚠️ Permanent Data Loss Warning</span>
                </div>
                <p>
                  Deleting this language will permanently purge all translation values stored for <span className="font-mono font-bold">{deleteTargetLang.code.toUpperCase()}</span>.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setDeleteTargetLang(null)}
                disabled={deletingLang}
                className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLanguage}
                disabled={deletingLang}
                className="px-5 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 shadow-sm transition-colors flex items-center gap-2"
              >
                {deletingLang ? (
                  <>
                    <span className="animate-spin">⏳</span> Deleting...
                  </>
                ) : (
                  <>
                    <span>🗑️</span> Delete Language
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
