// Shared attendance student-roster contract. Never include struck-off pupils
// in new daily marks; backend remains authoritative on active state and access.
export const activeAttendanceRosterParams = ({className,section}) => ({
  class:className,
  section,
  active:'true',
})
