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
  const [valuesMap, setValuesMap] = useState({});
  const [savingKeyId, setSavingKeyId] = useState(null);
  const [savedKeyId, setSavedKeyId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'values' && selectedLang) {
      fetchValues(selectedLang);
    }
  }, [activeTab, selectedLang]);

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
      const valRes = await i18nAdminService.getValues(langCode);
      const rawVals = valRes.data?.data || valRes.data;
      const map = {};
      if (Array.isArray(rawVals)) {
        rawVals.forEach(v => {
          map[v.keyId] = v.value;
        });
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

  const filteredKeys = keys.filter(k => {
    if (!searchFilter) return true;
    const query = searchFilter.toLowerCase();
    const val = (valuesMap[k._id] || '').toLowerCase();
    return k.key.toLowerCase().includes(query) || k.category.toLowerCase().includes(query) || val.includes(query);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Multi-Language Localization</h1>

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
          className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'languages' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('languages')}
        >
          Languages ({languages.length})
        </button>
        <button
          className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'keys' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('keys')}
        >
          Translation Keys ({keys.length})
        </button>
        <button
          className={`py-2 px-4 border-b-2 font-medium ${activeTab === 'values' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'}`}
          onClick={() => setActiveTab('values')}
        >
          Translation Values (Editor)
        </button>
      </div>

      {activeTab === 'languages' && (
        <div className="space-y-8">
          {/* Add Language Form */}
          <form onSubmit={handleAddLanguage} className="bg-white p-4 rounded shadow border max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">Add New Language</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Language Code (e.g. es, ar)</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border rounded p-2"
                value={newLangCode}
                onChange={e => setNewLangCode(e.target.value)}
                placeholder="es"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">English Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border rounded p-2"
                value={newLangName}
                onChange={e => setNewLangName(e.target.value)}
                placeholder="Spanish"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Native Name</label>
              <input
                type="text"
                className="mt-1 block w-full border rounded p-2"
                value={newLangNative}
                onChange={e => setNewLangNative(e.target.value)}
                placeholder="Español"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Text Direction</label>
              <select
                className="mt-1 block w-full border rounded p-2"
                value={newLangDirection}
                onChange={e => setNewLangDirection(e.target.value)}
              >
                <option value="ltr">LTR (Left to Right)</option>
                <option value="rtl">RTL (Right to Left - Arabic/Hebrew)</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Add Language
            </button>
          </form>

          {/* Languages Table */}
          <div className="bg-white rounded shadow border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Native Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(Array.isArray(languages) ? languages : []).map(lang => {
                  const baseUrl = window.location.origin.includes('5174')
                    ? 'http://localhost:8001'
                    : window.location.origin;
                  const langBundleUrl = `${baseUrl}/api/v1/i18n/bundles/${lang.code}/mobile`;

                  return (
                    <tr key={lang.code}>
                      <td className="px-6 py-4 font-bold text-gray-900">{lang.code}</td>
                      <td className="px-6 py-4">{lang.name}</td>
                      <td className="px-6 py-4">{lang.nativeName}</td>
                      <td className="px-6 py-4 uppercase text-xs">{lang.direction}</td>
                      <td className="px-6 py-4">{lang.isDefault ? 'Yes' : 'No'}</td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={() => handlePublish(lang.code)}
                          className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 shadow-sm"
                        >
                          Publish Bundle
                        </button>
                        <a
                          href={langBundleUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block px-3 py-1 bg-gray-100 border text-gray-700 text-xs font-medium rounded hover:bg-gray-200"
                        >
                          View Live JSON ↗
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'keys' && (
        <div className="space-y-8">
          {/* Create Key Form */}
          <form onSubmit={handleCreateKey} className="bg-white p-4 rounded shadow border max-w-lg space-y-4">
            <h2 className="text-lg font-semibold">Create New Translation Key</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Key String (e.g. common.watchNow)</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border rounded p-2"
                value={newKeyString}
                onChange={e => setNewKeyString(e.target.value)}
                placeholder="common.watchNow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input
                type="text"
                className="mt-1 block w-full border rounded p-2"
                value={newKeyCategory}
                onChange={e => setNewKeyCategory(e.target.value)}
                placeholder="common"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Namespace</label>
              <select
                className="mt-1 block w-full border rounded p-2"
                value={newKeyNamespace}
                onChange={e => setNewKeyNamespace(e.target.value)}
              >
                <option value="mobile">mobile</option>
                <option value="web">web</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
              Create Key
            </button>
          </form>

          {/* Keys Table */}
          <div className="bg-white rounded shadow border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key String</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Namespace</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(Array.isArray(keys) ? keys : []).map(k => (
                  <tr key={k._id}>
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

      {activeTab === 'values' && (
        <div className="space-y-6">
          {/* Top Bar Filters */}
          <div className="bg-white p-4 rounded shadow border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Target Language</label>
                <select
                  className="border rounded p-2 text-sm font-semibold text-gray-900 bg-gray-50"
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

              <div className="flex-1 max-w-md w-full">
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Search Keys / Values</label>
                <input
                  type="text"
                  className="w-full border rounded p-2 text-sm"
                  placeholder="Filter by key or text..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={() => handlePublish(selectedLang)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 shadow-sm flex items-center gap-2 self-start md:self-auto"
            >
              <span>🚀</span> Publish Release ({selectedLang.toUpperCase()})
            </button>
          </div>

          {/* Values Editor Table */}
          <div className="bg-white rounded shadow border overflow-hidden">
            {loadingValues ? (
              <div className="p-8 text-center text-gray-500">Loading translation values for {selectedLang.toUpperCase()}...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key String</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Translation Value ({selectedLang.toUpperCase()})</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredKeys.map(k => {
                    const currentVal = valuesMap[k._id] ?? '';
                    const isSaving = savingKeyId === k._id;
                    const isSaved = savedKeyId === k._id;

                    return (
                      <tr key={k._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-sm font-semibold text-gray-900 w-1/4">
                          {k.key}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-500 w-1/6">
                          <span className="px-2 py-1 bg-gray-100 rounded border">{k.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            className="w-full border rounded p-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={currentVal}
                            onChange={e => handleValueChange(k._id, e.target.value)}
                            placeholder={`Enter ${selectedLang.toUpperCase()} translation...`}
                          />
                        </td>
                        <td className="px-6 py-4 w-28">
                          <button
                            onClick={() => handleSaveValue(k._id)}
                            disabled={isSaving}
                            className={`px-3 py-1.5 text-xs font-semibold rounded shadow-sm transition-colors ${
                              isSaved
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {isSaving ? 'Saving...' : isSaved ? '✓ Saved' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredKeys.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No keys match your search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
