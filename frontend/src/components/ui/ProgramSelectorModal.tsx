import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { useAppStore } from '@/store';
import { X, Plus, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProgramSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProgramSelectorModal({ isOpen, onClose }: ProgramSelectorModalProps) {
  const navigate = useNavigate();
  const { programs, currentProgram, selectProgramById } = useAppStore();

  const handleSelectProgram = (programId: string) => {
    selectProgramById(programId);
    onClose();
  };

  const handleCreateNew = () => {
    navigate('/wizard');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden pointer-events-auto animate-scale-in flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div>
              <h3 className="text-xl font-semibold text-zinc-50">Select a Program</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Choose from your programs or create a new one
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              {/* Create New Program Card */}
              <Card
                className="cursor-pointer border-lime-500/30 bg-lime-500/5 hover:bg-lime-500/10 transition-colors"
                onClick={handleCreateNew}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-lime-500/20 rounded-lg flex items-center justify-center">
                        <Plus className="w-6 h-6 text-lime-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lime-400">Create New Program</h4>
                        <p className="text-sm text-zinc-400">
                          Design a custom training program
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-lime-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Existing Programs */}
              {programs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-500">No programs yet. Create your first one!</p>
                </div>
              ) : (
                programs.map((program) => (
                  <Card
                    key={program.id}
                    className={`cursor-pointer transition-all ${
                      currentProgram?.id === program.id
                        ? 'border-lime-400 bg-lime-400/5'
                        : 'hover:border-zinc-600 hover:bg-zinc-800/50'
                    }`}
                    onClick={() => handleSelectProgram(program.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-zinc-50">{program.title}</h4>
                            {currentProgram?.id === program.id && (
                              <span className="px-2 py-0.5 text-xs bg-lime-500/20 text-lime-400 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {program.weeks.length} weeks
                            </span>
                            <span>
                              Created {new Date(program.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 ${
                            currentProgram?.id === program.id ? 'text-lime-400' : 'text-zinc-600'
                          }`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-800">
            <Button variant="outline" onClick={onClose} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
