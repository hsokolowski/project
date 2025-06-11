import React, { useState, useEffect, useCallback } from 'react';
import { DataGroup, OmicsType, Dataset } from '../../types';
import { Activity, Dna, TestTube2, Database, FileSpreadsheet, Plus, X } from 'lucide-react';

interface GroupConfigProps {
  groups: DataGroup[];
  onGroupsUpdate: (groups: DataGroup[]) => void;
  availableAttributes: Array<{ name: string; dataset: Dataset }>;
  selectedDecisionAttribute?: string;
}

const GROUP_COLORS = {
  genomics: 'bg-blue-100 border-blue-300',
  proteomics: 'bg-green-100 border-green-300',
  metabolomics: 'bg-purple-100 border-purple-300',
  transcriptomics: 'bg-orange-100 border-orange-300',
  simple: 'bg-gray-100 border-gray-300'
};

const GROUP_ICONS = {
  genomics: Dna,
  proteomics: Activity,
  metabolomics: TestTube2,
  transcriptomics: Database,
  simple: FileSpreadsheet
};

export const GroupConfig: React.FC<GroupConfigProps> = ({
  groups,
  onGroupsUpdate,
  availableAttributes,
  selectedDecisionAttribute
}) => {
  const totalColumns = availableAttributes.length;

  const [newGroup, setNewGroup] = useState({
    name: '',
    type: 'simple' as OmicsType | 'simple',
    range: { start: 0, end: Math.min(999, totalColumns - 1) }
  });

  const addDefaultGroup = () => {
    const filteredAttrs = availableAttributes
      .filter(attr => attr.name !== selectedDecisionAttribute)
      .map(attr => attr.name);

    const defaultGroup: DataGroup = {
      id: `group-${Math.random().toString(36).substring(2, 9)}`,
      name: 'Default Group',
      type: 'simple',
      attributes: filteredAttrs,
      color: GROUP_COLORS.simple,
      range: {
        start: 0,
        end: filteredAttrs.length - 1
      }
    };

    onGroupsUpdate([defaultGroup]);
  };

  const addGroup = useCallback(() => {
    if (!newGroup.name.trim()) return;

    const rangeAttributes = availableAttributes
      .filter(attr => attr.name !== selectedDecisionAttribute)
      .map(attr => attr.name)
      .filter((_, index) => index >= newGroup.range.start && index <= newGroup.range.end);

    const lastMatchingIndex = availableAttributes.reduce((lastIdx, attr, idx) => {
      if (idx >= newGroup.range.start && idx <= newGroup.range.end && attr.name !== selectedDecisionAttribute) {
        return idx;
      }
      return lastIdx;
    }, -1);

    const group: DataGroup = {
      id: `group-${Math.random().toString(36).substring(2, 9)}`,
      name: newGroup.name.trim(),
      type: newGroup.type,
      attributes: rangeAttributes,
      color: GROUP_COLORS[newGroup.type],
      range: {
        start: newGroup.range.start,
        end: lastMatchingIndex
      }
    };

    onGroupsUpdate([...groups, group]);

    const nextStart = lastMatchingIndex + 1;
    const nextEnd = Math.min(nextStart + 999, totalColumns - 1);

    setNewGroup({
      name: '',
      type: 'simple',
      range: { start: nextStart, end: nextEnd }
    });
  }, [newGroup, availableAttributes, groups, onGroupsUpdate, selectedDecisionAttribute, totalColumns]);

  const removeGroup = useCallback((groupId: string) => {
    const updatedGroups = groups.filter(g => g.id !== groupId);
    onGroupsUpdate(updatedGroups);
  }, [groups, onGroupsUpdate]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="text"
          value={newGroup.name}
          onChange={e => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Group name"
          className="flex-1 px-3 py-2 border rounded"
        />
        <select
          value={newGroup.type}
          onChange={e => setNewGroup(prev => ({ ...prev, type: e.target.value as OmicsType | 'simple' }))}
          className="px-3 py-2 border rounded"
        >
          <option value="simple">Simple</option>
          <option value="genomics">Genomics</option>
          <option value="proteomics">Proteomics</option>
          <option value="metabolomics">Metabolomics</option>
          <option value="transcriptomics">Transcriptomics</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={newGroup.range.start}
            onChange={e => {
              const start = Math.max(0, parseInt(e.target.value) || 0);
              const end = Math.min(start + 999, totalColumns - 1);
              setNewGroup(prev => ({ ...prev, range: { start, end } }));
            }}
            className="w-20 px-2 py-2 border rounded"
          />
          <span>to</span>
          <input
            type="number"
            value={newGroup.range.end}
            onChange={e => {
              const end = Math.min(parseInt(e.target.value) || 0, totalColumns - 1);
              setNewGroup(prev => ({ ...prev, range: { ...prev.range, end } }));
            }}
            className="w-20 px-2 py-2 border rounded"
          />
        </div>
        <button
          onClick={addGroup}
          disabled={!newGroup.name.trim() || newGroup.range.start > newGroup.range.end}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={16} /> Add Group
        </button>
      </div>

      {groups.length === 0 && (
        <div className="text-sm text-gray-600 flex gap-4 items-center">
          <span>No groups defined.</span>
          <button
            onClick={addDefaultGroup}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Add Default Group
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(group => {
          const Icon = GROUP_ICONS[group.type];
          return (
            <div key={group.id} className={`p-4 rounded-lg border ${group.color}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <h4 className="font-medium">{group.name}</h4>
                  <span className="text-sm text-gray-500">
                    ({group.attributes.length} attributes)
                  </span>
                </div>
                <button
                  onClick={() => removeGroup(group.id)}
                  className="p-1 text-gray-500 hover:text-gray-700 hover:bg-white rounded-full"
                  title="Remove group"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="text-sm text-gray-600 mb-3">
                Columns {group.range?.start} to {group.range?.end}
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {group.attributes.map(attr => (
                  <div
                    key={attr}
                    className={`flex items-center justify-between text-sm bg-white p-2 rounded ${
                      attr === selectedDecisionAttribute ? 'bg-red-100 border border-red-300' : ''
                    }`}
                  >
                    <span>{attr}</span>
                    {attr === selectedDecisionAttribute && (
                      <span className="text-xs text-red-600">Decision Attr</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">How Column Ranges Work</h4>
        <p className="text-sm text-blue-600">
          Groups are defined by column ranges (e.g., 0-999). When you create a new group, the range automatically adjusts to include available columns and the next group will start from the next available column. If you specify a range beyond the total number of columns, it will be adjusted to fit within the available columns. Decision attribute is excluded from group attributes.
        </p>
      </div>
    </div>
  );
};
