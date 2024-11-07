import React from 'react';
import { Card, Badge, ScrollArea } from '@/components/ui/Card';
import { Trophy, ArrowUp, ArrowDown, Minus } from 'lucide-react';

const getPositionColor = (pos, tablerows) => {
  if (pos === 1) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
  if (pos === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400';
  if (pos === 3) return 'bg-gradient-to-r from-amber-600 to-amber-700';

  // Check if team is in promotion zone
  const team = tablerows.find((row) => row.pos === pos);
  if (team?.promotion?.name === 'Promotion') {
    return 'bg-gradient-to-r from-green-500 to-green-600';
  }

  // Check if team is in relegation zone
  if (team?.promotion?.name === 'Relegation') {
    return 'bg-gradient-to-r from-red-500 to-red-600';
  }

  return 'bg-gray-100';
};

const PositionChange = ({ change }) => {
  if (change > 0) {
    return <ArrowUp className='w-4 h-4 text-green-500' />;
  } else if (change < 0) {
    return <ArrowDown className='w-4 h-4 text-red-500' />;
  }
  return <Minus className='w-4 h-4 text-gray-400' />;
};

const TeamStats = ({ label, value }) => (
  <div className='flex flex-col items-center px-3'>
    <span className='text-xs text-gray-500'>{label}</span>
    <span className='font-semibold text-gray-900'>{value}</span>
  </div>
);

const TournamentTable = ({ tournament }) => {
  const tables = tournament?.table?.tables;

  if (!tables?.length || !tables[0]?.tablerows?.length) {
    return (
      <Card className='p-6 text-center text-gray-500 bg-gray-50'>
        No tournament data available
      </Card>
    );
  }

  const tableRows = tables[0].tablerows;

  return (
    <Card className='overflow-hidden'>
      <div className='p-5 bg-gradient-to-r from-gray-50 to-white border-b'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Trophy className='w-5 h-5 text-amber-500' />
            <h3 className='font-semibold text-gray-900'>League Table</h3>
          </div>
          <Badge variant='secondary' className='text-xs'>
            Round {tables[0].currentround}/{tables[0].maxrounds}
          </Badge>
        </div>
      </div>

      <ScrollArea className='h-[500px]'>
        <div className='p-4'>
          <div className='space-y-2'>
            {tableRows.map((row) => (
              <div
                key={row.team._id}
                className='relative flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 transition-all group'
              >
                {/* Position indicator */}
                <div className='flex items-center gap-2 min-w-[80px]'>
                  <div
                    className={`w-8 h-8 flex items-center justify-center text-white font-semibold rounded-lg shadow-sm ${getPositionColor(
                      row.pos,
                      tableRows
                    )}`}
                  >
                    {row.pos}
                  </div>
                  <PositionChange change={row.changeTotal} />
                </div>

                {/* Team name */}
                <div className='flex-1'>
                  <div className='font-medium text-gray-900'>
                    {row.team.name}
                  </div>
                  {row.promotion && (
                    <div className='text-xs text-gray-500'>
                      {row.promotion.name}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className='flex items-center gap-2 text-sm'>
                  <TeamStats label='P' value={row.total} />
                  <TeamStats label='W' value={row.winTotal} />
                  <TeamStats label='D' value={row.drawTotal} />
                  <TeamStats label='L' value={row.lossTotal} />
                  <TeamStats label='GF' value={row.goalsForTotal} />
                  <TeamStats label='GA' value={row.goalsAgainstTotal} />
                  <TeamStats label='GD' value={row.goalDiffTotal} />
                  <div className='pl-4 border-l'>
                    <TeamStats
                      label='PTS'
                      value={
                        <span className='text-base font-bold text-gray-900'>
                          {row.pointsTotal}
                        </span>
                      }
                    />
                  </div>
                </div>

                {/* Hover indicator */}
                <div className='absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-lg' />
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
};

export default TournamentTable;
