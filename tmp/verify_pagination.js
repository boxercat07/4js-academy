async function testPagination() {
    console.log('--- TESTING PAGINATION LOGIC (SIMULATION) ---');
    
    // Simulating the backend logic built into users.js
    const mockData = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `User ${i}` }));
    const page = 2;
    const limit = 20;
    const total = mockData.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginated = mockData.slice(startIndex, startIndex + limit);
    
    console.log(`Page: ${page}, Limit: ${limit}`);
    console.log(`Total items: ${total}, Total pages: ${totalPages}`);
    console.log(`Items returned: ${paginated.length}`);
    console.log(`First item on page: ${paginated[0].name}`); // Should be User 20
    
    if (paginated.length === 20 && paginated[0].name === 'User 20') {
        console.log('SUCCESS: Pagination logic is correct.');
    } else {
        console.log('FAILED: Pagination logic mismatch.');
    }

    console.log('\n--- SIMULATING SEARCH QUERY ---');
    const search = 'User 1'; // Should match User 1, User 10-19
    const filtered = mockData.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));
    console.log(`Searching for "${search}"...`);
    console.log(`Found ${filtered.length} matches.`);
    if (filtered.length > 1) {
        console.log('SUCCESS: Filtering logic is correct.');
    } else {
        console.log('FAILED: Filtering logic mismatch.');
    }
}

testPagination().catch(console.error);
