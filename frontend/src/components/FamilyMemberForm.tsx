import { Plus, Trash2, Users } from 'lucide-react';

export interface FamilyMember {
  name: string;
  age: number | '';
  relationship: string;
  phone: string;
}

interface FamilyMemberFormProps {
  members: FamilyMember[];
  onChange: (members: FamilyMember[]) => void;
  maxMembers?: number;
}

export default function FamilyMemberForm({
  members,
  onChange,
  maxMembers = 4,
}: FamilyMemberFormProps) {
  const addMember = () => {
    if (members.length >= maxMembers) return;
    onChange([...members, { name: '', age: '', relationship: 'Spouse', phone: '' }]);
  };

  const removeMember = (index: number) => {
    onChange(members.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof FamilyMember, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4 bg-gray-950/80 border border-green-500/30 p-4 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-green-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Family Plan Member Details ({members.length}/{maxMembers})
          </h4>
        </div>
        {members.length < maxMembers && (
          <button
            type="button"
            onClick={addMember}
            className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/40 rounded-xl text-xs font-semibold hover:bg-green-500/30 transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Family Member
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-400">
        Please provide details for all family members included under this package.
      </p>

      {members.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500 mb-2">No family members added yet.</p>
          <button
            type="button"
            onClick={addMember}
            className="px-3 py-1.5 bg-green-500 text-black font-bold text-xs rounded-xl hover:bg-green-400 transition-all"
          >
            + Add First Member
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member, index) => (
            <div
              key={index}
              className="p-3 bg-gray-900 border border-gray-800 rounded-xl space-y-3 relative group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 border-b border-gray-800 pb-1.5">
                <span>Member #{index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10"
                  title="Remove Member"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={member.name}
                    onChange={(e) => updateMember(index, 'name', e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                    Relationship
                  </label>
                  <select
                    value={member.relationship}
                    onChange={(e) => updateMember(index, 'relationship', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={member.age}
                    onChange={(e) =>
                      updateMember(index, 'age', e.target.value ? parseInt(e.target.value, 10) : '')
                    }
                    placeholder="e.g. 28"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                    Phone / Contact
                  </label>
                  <input
                    type="text"
                    value={member.phone}
                    onChange={(e) => updateMember(index, 'phone', e.target.value)}
                    placeholder="+94 7X XXX XXXX"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
