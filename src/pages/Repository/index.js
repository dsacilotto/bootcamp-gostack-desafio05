import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

import api from '../../services/api';

import Container from '../../components/Container';
import { Loading, Owner, IssueList, IssueFilter, PageActions } from './styles';

export default class Repository extends Component {
  static propTypes = {
    match: PropTypes.shape({
      params: PropTypes.shape({
        repository: PropTypes.string,
      }),
    }).isRequired,
  };

  state = {
    repository: {},
    issues: [],
    loading: true,
    filters: [
      { state: 'all', label: 'All', active: true },
      { state: 'open', label: 'Open', active: false },
      { state: 'closed', label: 'Closed', active: false },
    ],
    filterIndex: 0,
    page: 1,
    hasNextPage: false,
    repoName: null,
  };

  async componentDidMount() {
    const { match } = this.props;
    const repoName = decodeURIComponent(match.params.repository);

    const [repository, issues] = await Promise.all([
      api.get(`/repos/${repoName}`),
      api.get(`/repos/${repoName}/issues`, {
        params: {
          state: 'all',
          per_page: 6,
        },
      }),
    ]);

    const hasNextPage = issues.data.length > 5;

    this.setState({
      repository: repository.data,
      issues: issues.data.slice(0, 5),
      loading: false,
      repoName,
      hasNextPage,
    });
  }

  loadIssues = async () => {
    const { filters, filterIndex, page, repoName } = this.state;

    const issues = await api.get(`/repos/${repoName}/issues`, {
      params: {
        state: filters[filterIndex].state,
        per_page: 5,
        page,
      },
    });

    const seperators = [',', ';'];
    const pageDataArray = issues.headers.link.split(
      new RegExp(seperators.join('|'))
    );
    const hasNextPage = pageDataArray.includes(' rel="next"');

    this.setState({
      issues: issues.data,
      hasNextPage,
    });
  };

  handleFilterClick = async filterIndex => {
    await this.setState({
      filterIndex,
      page: 1,
    });

    this.loadIssues();
  };

  handlePage = async action => {
    const { page } = this.state;

    await this.setState({
      page: action === 'back' ? page - 1 : page + 1,
    });

    this.loadIssues();
  };

  render() {
    const {
      repository,
      issues,
      loading,
      filters,
      filterIndex,
      page,
      hasNextPage,
    } = this.state;

    if (loading) {
      return <Loading>Loading...</Loading>;
    }

    return (
      <Container>
        <Owner>
          <Link to="/">Back to repositories</Link>
          <img src={repository.owner.avatar_url} alt={repository.owner.login} />
          <h1>{repository.name}</h1>
          <p>{repository.description}</p>
        </Owner>

        <IssueList>
          <IssueFilter active={filterIndex}>
            {filters.map((filter, index) => (
              <button
                type="button"
                key={filter.label}
                onClick={() => this.handleFilterClick(index)}
              >
                {filter.label}
              </button>
            ))}
          </IssueFilter>

          {issues.map(issue => (
            <li key={String(issue.id)}>
              <img src={issue.user.avatar_url} alt={issue.user.login} />
              <div>
                <strong>
                  <a href={issue.html_url}>{issue.title}</a>
                  {issue.labels.map(label => (
                    <span key={String(label.id)}>{label.name}</span>
                  ))}
                </strong>
                <p>{issue.user.login}</p>
              </div>
            </li>
          ))}
        </IssueList>

        <PageActions>
          <button
            type="button"
            disabled={page < 2}
            onClick={() => this.handlePage('back')}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            disabled={!hasNextPage}
            onClick={() => this.handlePage('next')}
          >
            Next
          </button>
        </PageActions>
      </Container>
    );
  }
}
