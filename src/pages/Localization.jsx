import React, { useEffect, useState } from 'react';
import { i18nAdminService } from '../services/i18nAdminService';

export default function Localization() {
  const [activeTab, setActiveTab] = useState('languages');
  const [languages, setLanguages] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLangCode, setNewLangCode] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [newLangNative, setNewLangNative] = useState('');
  const [newLangDirection, setNewLangDirection] = useState('ltr');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [langRes, keyRes] = await Promise.all([
        i18nAdminService.getLanguages(),
        i18nAdminService.getKeys()
      ]);
      setLanguages(langRes.data || []);
      setKeys(keyRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  const handlePublish = async (code) => {
    try {
      await i18nAdminService.publishRelease({ languageCode: code, namespace: 'mobile' });
      alert(`Published new release for ${code.toUpperCase()} successfully!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish release');
    }
  };

  if (loading) {
    return <div className="p-6">Loading localization settings...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Multi-Language Localization</h1>

      {/* Tabs */}
      <div className="flex border-b mb-6 space-x-4">
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
                {languages.map(lang => (
                  <tr key={lang.code}>
                    <td className="px-6 py-4 font-bold text-gray-900">{lang.code}</td>
                    <td className="px-6 py-4">{lang.name}</td>
                    <td className="px-6 py-4">{lang.nativeName}</td>
                    <td className="px-6 py-4 uppercase text-xs">{lang.direction}</td>
                    <td className="px-6 py-4">{lang.isDefault ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handlePublish(lang.code)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Publish Bundle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'keys' && (
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
              {keys.map(k => (
                <tr key={k._id}>
                  <td className="px-6 py-4 font-mono text-sm">{k.key}</td>
                  <td className="px-6 py-4">{k.category}</td>
                  <td className="px-6 py-4">{k.namespace}</td>
                  <td className="px-6 py-4">{k.variables?.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
