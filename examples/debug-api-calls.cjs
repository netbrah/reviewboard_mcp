const { ReviewBoardClient } = require('./build/reviewboard-client.js');

// Debug specific API calls to find where 401 occurs
async function debugApiCalls() {
    console.log('🔍 Debugging specific API calls...');

    const config = {
        baseUrl: 'https://reviewboard.netapp.com',
        username: 'palanisd',
        apiToken: 'f4064a8b8a9a1e0d29d7a8a0f3a7d5b9f1c2e3d4'
    };

    const client = new ReviewBoardClient(config);

    try {
        console.log('1. Testing reviews API...');
        const reviewsResponse = await client.client.get(`/api/review-requests/882166/reviews/`);
        console.log('✅ Reviews API works, found', reviewsResponse.data.reviews?.length || 0, 'reviews');

        console.log('\n2. Testing diffs API...');
        const diffsResponse = await client.client.get(`/api/review-requests/882166/diffs/`);
        const diffs = diffsResponse.data.diffs || [];
        console.log('✅ Diffs API works, found', diffs.length, 'diffs');

        if (diffs.length > 0) {
            console.log('\n3. Testing files API for each diff...');
            for (const diff of diffs) {
                try {
                    console.log(`  Testing diff ${diff.id}...`);
                    const filesResponse = await client.client.get(`/api/review-requests/882166/diffs/${diff.id}/files/`);
                    console.log(`  ✅ Diff ${diff.id} files API works, found ${filesResponse.data.files?.length || 0} files`);
                } catch (error) {
                    console.log(`  ❌ Diff ${diff.id} files API failed:`, error.message);
                }
            }
        }

        console.log('\n4. Testing diff comments API...');
        const reviews = reviewsResponse.data.reviews || [];
        if (reviews.length > 0) {
            for (let i = 0; i < Math.min(reviews.length, 2); i++) {
                const review = reviews[i];
                try {
                    console.log(`  Testing review ${review.id} comments...`);
                    const commentsResponse = await client.client.get(review.links.diff_comments.href);
                    console.log(`  ✅ Review ${review.id} comments API works, found ${commentsResponse.data.diff_comments?.length || 0} comments`);
                } catch (error) {
                    console.log(`  ❌ Review ${review.id} comments API failed:`, error.message);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error during debugging:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugApiCalls();
