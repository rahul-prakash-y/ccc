import { useRef, useCallback, useLayoutEffect } from 'react';

/**
 * useStableCallback(fn)
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns a callback with a STABLE reference (never changes between renders)
 * while always calling the latest version of `fn`.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The anti-pattern in Admin/Student dashboards looks like this:
 *
 *   const { students } = useStudentStore();
 *
 *   // ❌ BAD: `students.length` changing after a fetch causes this callback to
 *   //         be recreated. That new reference triggers the useEffect below,
 *   //         which kicks off another fetch → another length change → infinite
 *   //         re-fetch loop that will saturate and kill a free-tier backend.
 *   const handleSort = useCallback(() => {
 *     doSomethingWith(students.length);
 *   }, [students.length]);   // ← THIS is the bomb
 *
 *   useEffect(() => { fetchStudents(); }, [handleSort]); // ← THIS detonates it
 *
 * Every time `students` changes, `handleSort` gets a new reference, which
 * re-runs the effect, which fetches again, which changes `students.length`…
 *
 * SOLUTION A — Functional Update Pattern (preferred for setters)
 * ────────────────────────────────────────────────────────────────
 * When you just need to update state based on previous state, pass a function
 * to the Zustand setter instead of reading current state as a dep:
 *
 *   // ✅ GOOD: zero data deps needed
 *   const addItem = useCallback((item) => {
 *     setStudents(prev => [item, ...prev]);   // Zustand functional update
 *   }, []);  // empty array — stable forever
 *
 * SOLUTION B — useStableCallback (for read callbacks that can't be rewritten)
 * ────────────────────────────────────────────────────────────────────────────
 *   // ✅ GOOD: The returned `stableSort` never changes reference, so any
 *   //         useEffect/useMemo that depends on it will NOT re-run just because
 *   //         `students` was updated by a fetch.
 *   const stableSort = useStableCallback(() => {
 *     doSomethingWith(students);  // always reads the LATEST students via closure
 *   });
 *
 * HOW IT WORKS
 * ────────────
 * We store `fn` in a ref so we always have the latest version.
 * The returned callback is wrapped in useCallback([]) — empty deps — so its
 * identity is forever stable. On invocation it reads `fnRef.current`, which
 * points to the latest `fn` without creating a new outer function reference.
 *
 * @param {Function} fn - The function to stabilise
 * @returns {Function}  - A stable wrapper that always calls the latest `fn`
 */
export function useStableCallback(fn) {
    const fnRef = useRef(fn);

    // Keep the ref up-to-date synchronously after every render — useLayoutEffect
    // satisfies the React compiler rule that refs must not be mutated during render.
    useLayoutEffect(() => {
        fnRef.current = fn;
    });

    // This wrapper has a stable identity (empty dep array) yet calls the
    // freshest `fn` each time it is invoked — the best of both worlds.
    return useCallback((...args) => fnRef.current(...args), []);
}


// ─────────────────────────────────────────────────────────────────────────────
//  USAGE EXAMPLES
//  Copy these patterns into your Admin / Student dashboard components.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ─── EXAMPLE 1: Student Dashboard (functional update pattern) ───────────────
 *
 * BEFORE (broken — causes cascading re-fetches):
 *
 *   const { students, fetchStudents } = useStudentStore();
 *
 *   const handleAddStudent = useCallback((newStudent) => {
 *     setStudents([newStudent, ...students]);   // reads `students` — dep needed
 *   }, [students]);          // ← students.length changes → new ref → re-fetch loop
 *
 *   useEffect(() => { fetchStudents(); }, [handleAddStudent]);
 *
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * AFTER (fixed — zero cascading re-fetches):
 *
 *   import { useEffect, useCallback } from 'react';
 *   import { useStudentStore } from '../../store/studentStore';
 *
 *   const StudentDashboard = () => {
 *       const { fetchStudents, addStudent } = useStudentStore();
 *
 *       // ✅ Pattern A — Functional Update (for state mutations)
 *       //    Zustand's `addStudent` action already uses (state) => …
 *       //    so you never read `students` in the callback at all.
 *       const handleAddStudent = useCallback((newStudent) => {
 *           addStudent(newStudent);  // the store does: set(s => [newStudent,...s.students])
 *       }, [addStudent]);  // addStudent from Zustand is already stable
 *
 *       // fetchStudents from the store is also stable (Zustand actions don't change).
 *       // So this effect runs exactly ONCE on mount and never again.
 *       useEffect(() => {
 *           fetchStudents();
 *       }, [fetchStudents]);
 *
 *       // …
 *   };
 */

/**
 * ─── EXAMPLE 2: Admin Dashboard (useStableCallback pattern) ─────────────────
 *
 * Use this when you have a callback that reads derived state but you don't
 * want that derived state to affect referential stability.
 *
 * BEFORE (broken):
 *
 *   const { admins } = useAdminStore();
 *
 *   const handleExport = useCallback(() => {
 *     downloadCSV(admins);   // reads `admins`
 *   }, [admins]);            // ← re-created every fetch → triggers re-fetches
 *
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * AFTER (fixed):
 *
 *   import { useStableCallback } from '../../hooks/useStableCallback';
 *   import { useAdminStore }     from '../../store/adminStore';
 *
 *   const AdminDashboard = () => {
 *       const { admins, fetchAdmins } = useAdminStore();
 *
 *       // ✅ Pattern B — useStableCallback (for read callbacks)
 *       //    `handleExport` will NEVER change reference, even when `admins`
 *       //    changes. The closure always reads the latest `admins` via the ref.
 *       const handleExport = useStableCallback(() => {
 *           downloadCSV(admins);
 *       });
 *
 *       // This effect runs ONCE. Period.
 *       useEffect(() => {
 *           fetchAdmins();
 *       }, [fetchAdmins]);
 *
 *       return <button onClick={handleExport}>Export CSV</button>;
 *   };
 */
